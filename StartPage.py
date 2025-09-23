<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> eaf4bbfa65d2589b7ef69d1deeeca978a15d984c
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import mysql.connector
import random
<<<<<<< HEAD
=======
# StartPage.py
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import mysql.connector
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
=======
>>>>>>> eaf4bbfa65d2589b7ef69d1deeeca978a15d984c

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",  # 改成你的密碼
    "database": "tarot_db"
}

# 首頁
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("StartPage.html", {"request": request})

# 塔羅抽牌頁
@app.get("/tarot", response_class=HTMLResponse)
<<<<<<< HEAD
<<<<<<< HEAD
async def tarot(request: Request, count: int = 4, category_id: int = 1):
    from tarot_ui import generate_tarot_html
    slot_titles = ["過去", "現在", "未來"] if count == 3 else ["問題核心", "障礙或短處", "對策", "資源或長處"]
=======
async def tarot(request: Request, count: int = 4, category_id: int = None, subquestion_id: int = None):
    slot_titles = ["過去", "現在", "未來"] if count == 3 else ["問題核心", "障礙或短處", "對策", "資源或長處"]
    from tarot_ui import generate_tarot_html
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
=======
async def tarot(request: Request, count: int = 4, category_id: int = 1):
    from tarot_ui import generate_tarot_html
    slot_titles = ["過去", "現在", "未來"] if count == 3 else ["問題核心", "障礙或短處", "對策", "資源或長處"]
>>>>>>> eaf4bbfa65d2589b7ef69d1deeeca978a15d984c
    tarot_html = generate_tarot_html(slot_titles)
    return templates.TemplateResponse("DrawCard.html", {
        "request": request,
        "tarot_html": tarot_html,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> eaf4bbfa65d2589b7ef69d1deeeca978a15d984c
        "count": count,
        "category_id": category_id
    })

# 解牌頁
@app.get("/interpret", response_class=HTMLResponse)
async def interpret_page(request: Request, count: int = 3, category_id: int = 1):
    return templates.TemplateResponse("interpret.html", {
        "request": request,
        "count": count,
        "category_id": category_id
<<<<<<< HEAD
=======
        "category_id": category_id,
        "subquestion_id": subquestion_id
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
=======
>>>>>>> eaf4bbfa65d2589b7ef69d1deeeca978a15d984c
    })

# API: 取得 categories
@app.get("/api/categories")
async def get_categories():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name FROM categories")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# API: 取得子問題
@app.get("/api/subquestions/{category_id}")
async def get_subquestions(category_id: int):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, question FROM subquestions WHERE category_id = %s", (category_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# API: 自動抽牌 + 解釋（加上牌位名稱）
@app.post("/api/interpret")
async def interpret_api(request: Request):
    data = await request.json()
    category_id = data.get("category_id")
    count = data.get("count", random.choice([3, 4]))

    if not category_id:
        return JSONResponse({"status": "error", "msg": "缺少 category_id"}, status_code=400)

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

    # 一次查完所有 selected_cards 的 meanings
    card_ids = [c["id"] for c in selected_cards]
    format_ids = ",".join(["%s"] * len(card_ids))
    cursor.execute(f"""
        SELECT card_id, upright_meaning, reversed_meaning
        FROM card_meanings
        WHERE category_id = %s AND card_id IN ({format_ids})
    """, [category_id, *card_ids])
    meanings_rows = cursor.fetchall()
    meanings_dict = {row["card_id"]: row for row in meanings_rows}

    # 牌位名稱
    position_names_3 = ["過去", "現在", "未來"]
    position_names_4 = ["問題核心", "障礙或短處", "對策", "資源或長處"]
    position_names = position_names_3 if count == 3 else position_names_4

    result = []
    for i, card in enumerate(selected_cards):
        position = random.choice(["upright", "reversed"])
        row = meanings_dict.get(card["id"], {})
        meaning = row.get("upright_meaning") if position == "upright" else row.get("reversed_meaning")
        if not meaning:
            meaning = "暫無解釋"

        # 圖片路徑：根據卡牌名稱找對應資料夾
        name = card["cards_name"]
        if name in ["愚人","魔術師","女祭司","皇后","皇帝","教皇","戀人","戰車","力量","隱者","命運之輪","正義","倒吊人","死神","節制","惡魔","高塔","星星","月亮","太陽","審判","世界"]:
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
            "name": name,
            "position": "正位" if position == "upright" else "逆位",
            "meaning": meaning,
            "image": image_path,
            "position_name": position_names[i]  # <-- 新增牌位名稱
        })

    cursor.close()
    conn.close()
    return {"status": "ok", "cards": result}
