# main.py
import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import mysql.connector
from openai import OpenAI
import random
import traceback

# ✅ 從環境變數讀取 API Key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("請先在環境變數中設定 OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# FastAPI 初始化
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 資料庫設定
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",  # 改成你的密碼
    "database": "tarot_db"
}

# ===== 首頁 =====
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("StartPage.html", {"request": request})

# ===== 選擇問題類型 / 子問題 / 占卜張數頁 =====
@app.get("/select", response_class=HTMLResponse)
async def select_page(request: Request):
    return templates.TemplateResponse("SelectPage.html", {"request": request})

# ===== 塔羅抽牌頁 =====
@app.get("/tarot", response_class=HTMLResponse)
async def tarot(request: Request, count: int = 3, category_id: int = 1, subquestion: str = ""):
    
    return templates.TemplateResponse(
        "DrawCard.html",
        {
            "request": request,
            # "tarot_html": tarot_html,
            "count": count,
            "category_id": category_id,
            "subquestion_text": subquestion  # ✅ 新增傳入模板
        }
    )

# ===== 解牌頁 =====
@app.get("/interpret", response_class=HTMLResponse)
async def interpret_page(request: Request, count: int = 3, category_id: int = 1, subquestion: str = ""):
    return templates.TemplateResponse(
        "interpret.html",
        {
            "request": request,
            "count": count,
            "category_id": category_id,
            "subquestion_text": subquestion  # ✅ 新增傳入模板
        }
    )

# ===== API: 取得 categories =====
@app.get("/api/categories")
async def get_categories():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name FROM categories")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# ===== API: 自動抽牌 + 解釋 =====
@app.post("/api/interpret")
async def interpret_api(request: Request):
    data = await request.json()
    print("Request JSON:", data)
    category_id = data.get("category_id")
    subquestion = data.get("subquestion_text")
    count = data.get("count", random.choice([3, 4]))
    print("Received category_id, subquestion_text, count:", category_id, subquestion, count)

    if not category_id:
        return JSONResponse({"status": "error", "msg": "缺少 category_id"}, status_code=400)
    
    if subquestion is None:
        return JSONResponse({"status": "error", "msg": "缺少 subquestion_text"}, status_code=400)

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    # 隨機選 count 張牌
    cursor.execute("SELECT id, cards_name FROM cards")
    all_cards = cursor.fetchall()
    if len(all_cards) < count:
        cursor.close()
        conn.close()
        return JSONResponse({"status": "error", "msg": "卡牌數量不足"}, status_code=400)

    selected_cards = random.sample(all_cards, count)

    # 查該 category_id 的卡牌意義
    card_ids = [c["id"] for c in selected_cards]
    format_ids = ",".join(["%s"] * len(card_ids))
    cursor.execute(
        f"""
        SELECT card_id, upright_meaning, upright_keyword, reversed_meaning, reversed_keyword
        FROM card_meanings
        WHERE category_id = %s AND card_id IN ({format_ids})
        """,
        [category_id, *card_ids]
    )
    meanings_rows = cursor.fetchall()
    meanings_dict = {row["card_id"]: row for row in meanings_rows}

    # 牌位名稱
    position_names = ["過去", "現在", "未來"] if count == 3 else [
        "問題核心", "障礙或短處", "對策", "資源或長處"]

    result = []
    for i, card in enumerate(selected_cards):
        position = random.choice(["upright", "reversed"])
        row = meanings_dict.get(card["id"], {})
        meaning = row.get("upright_meaning") if position == "upright" else row.get(
            "reversed_meaning")
        keyword = row.get("upright_keyword") if position == "upright" else row.get(
            "reversed_keyword")
        if not meaning:
            meaning = "暫無解釋"

        # 圖片路徑：根據卡牌名稱找對應資料夾
        name = card["cards_name"]
        if name in ["愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者", "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽", "審判", "世界"]:
            folder = "大阿爾克"
        elif "聖杯" in name:
            folder = "聖杯"
        elif "錢幣" in name:
            folder = "錢幣"
        elif "寶劍" in name:
            folder = "寶劍"
        elif "權杖" in name:
            folder = "權杖"
        else:
            folder = "其他"
        image_path = f"/static/images/{folder}/{name}.png"

        result.append({
            "id": card["id"],
            "name": card["cards_name"],
            "position": "正位" if position == "upright" else "逆位",
            "meaning": meaning,
            "keyword": keyword,
            "image": image_path,
            "position_name": position_names[i]
        })

    cursor.close()
    conn.close()
    return {"status": "ok", "cards": result, "count": count}

# ===== API: GPT 占卜總結 =====
@app.post("/api/summary")
async def tarot_summary(request: Request):
    try:
        data = await request.json()
        # print("Request JSON:", data)
        category_id = data.get("category_id")
        subquestion = data.get("subquestion_text")
        cards = data.get("cards", [])
        
        # print("Received question,subquestion:", category_id, subquestion)

        if not cards:
            return {"status": "error", "msg": "缺少卡牌資料"}

        # 整理卡牌資訊
        card_text = "\n".join([
            f"{c['position_name']}：{c['name']}（{c['position']}）→ {c['meaning']} [關鍵詞: {c.get('keyword', '')}]"
            for c in cards
        ])
        
        # print("Card Text:", card_text)

        prompt = f"""
            你是一位溫柔的塔羅占卜師。請根據以下抽牌結果撰寫完整占卜故事。
            要求：
            1. 使用繁體中文。
            2. 以段落形式呈現，每個重點段落用 <p>...</p>。
            3. 牌位、關鍵詞或重要建議用 <strong>加粗</strong>。
            4. 依據正逆位關鍵詞加強故事性。
            5. 給使用者溫暖建議。
            篇幅約 200~300 字。

            問題：{category_id}
            子問題：{subquestion}
            抽到的牌：
            {card_text}
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "你是一位善於引導的塔羅占卜師"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.9
        )

        story = response.choices[0].message.content.strip()
        return {"status": "ok", "summary": story}

    except Exception as e:
        print(traceback.format_exc())
        return {"status": "error", "msg": str(e)}
