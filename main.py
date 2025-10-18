# main.py
from openai import OpenAI
from starlette.requests import Request
import os
import jwt
import bcrypt
import random
import traceback
import mysql.connector
import requests
import base64
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, Form, Depends, HTTPException, Cookie
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from authlib.integrations.starlette_client import OAuth
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware
# from OAuth import OAuth2PasswordRequestFormWithCookie
# from email_config import conf

# ========= 初始化 =========
load_dotenv()
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ========= 資料庫 =========
db_config = {
    "host": "localhost",
    # "port":3307,
    "user": "root",
    "password": "",  # 改成你的密碼
    "database": "tarot_db"
}

# ========= 安全設定 =========
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小時

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# ========= 郵件設定 =========
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,    # ⚡新版參數
    MAIL_SSL_TLS=False,    # ⚡新版參數
    USE_CREDENTIALS=True,
    # TEMPLATE_FOLDER='templates/email'  # ⚡email template 資料夾
)

# ========= 設定 session middleware =========
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "超級秘密字串"),  # ⚠️建議放 .env
    https_only=False  # 若用 HTTPS，上線時改成 True
)

# ========= Google 登入 =========
oauth = OAuth()
CONF_URL = 'https://accounts.google.com/.well-known/openid-configuration'
oauth.register(
    name='google',
    server_metadata_url=CONF_URL,
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    client_kwargs={'scope': 'openid email profile'}
)

# ========= 模型 =========


class User(BaseModel):
    email: str
    name: str
    picture: str | None = None


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")


if not OPENAI_API_KEY:
    raise RuntimeError("請先在 .env 檔中設定 OPENAI_API_KEY")
if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
    raise RuntimeError("請先在 .env 檔中設定 Spotify API 金鑰")
if not OPENAI_API_KEY:
    raise RuntimeError("請先在 .env 檔中設定 OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# ========= 工具函數 =========


def get_user_by_email(email: str):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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
    # print("Request JSON:", data)
    category_id = data.get("category_id")
    subquestion = data.get("subquestion_text")
    count = data.get("count", random.choice([3, 4]))
    # print("Received category_id, subquestion_text, count:", category_id, subquestion, count)

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

    # 先查 category_id 對應的名稱（除錯）
    cursor.execute("SELECT name FROM categories WHERE id = %s", (category_id,))
    category_row = cursor.fetchone()
    category_name = category_row["name"] if category_row else "未知分類"
    # print("Category name:", category_name)

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
            2. 問題類型中的感情有多方面的解釋(例如：愛情、親情、友情、職場關係等)，請根據子問題調整故事內容。
            3. 以段落形式呈現，每個重點段落用 <p>...</p>。
            4. 牌位、關鍵詞或重要建議用 <strong>加粗</strong>。
            5. 依據正逆位關鍵詞加強故事性。
            6. 給使用者溫暖建議。
            7. 最後做一段總結，給予正向鼓勵。
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


SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")


def get_spotify_token():
    """取得 Spotify API Token"""
    auth = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    b64_auth = base64.b64encode(auth.encode()).decode()
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {b64_auth}"},
        data={"grant_type": "client_credentials"}
    )
    return response.json().get("access_token")


@app.post("/api/recommend_music")
async def recommend_music(request: Request):
    data = await request.json()
    tarot_summary = data.get("summary", "")
    subquestion = data.get("subquestion_text", "")

    if not tarot_summary:
        return {"status": "error", "msg": "缺少塔羅總結內容"}

    # 🧠 GPT prompt: 生成總主題 + 3~5 首符合塔羅總結情緒的中文歌曲
    prompt = f"""
你是一位專業的音樂心理分析師，根據以下塔羅占卜總結挑選3~5首中文歌曲。
請同時給出一個簡短的「總主題」 (theme)，代表整體音樂情緒方向。
每首歌曲需包含：
- name: 歌名
- artist: 歌手
- style: 音樂風格
- mood: 情緒氛圍
- lyrics_hint: 歌詞方向建議
請回傳 JSON 格式如下：
{{
    "theme": "XXX",
    "songs": [
        {{ "name":"...", "artist":"...", "style":"...",
            "mood":"...", "lyrics_hint":"..." }},
        ...
    ]
}}
塔羅占卜總結：
{tarot_summary}
子問題：
{subquestion}
"""

    import json
    try:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "你是一位能讀懂情緒並推薦韓文歌曲的分析師"},
                {"role": "user", "content": prompt}
            ],
        )
        music_data = json.loads(response.choices[0].message.content.strip())
        # print("GPT 推薦歌曲:", music_data)
    except Exception as e:
        print("GPT 生成錯誤:", e)
        # fallback
        music_data = {
            "theme": "心靈療癒",
            "songs": [
                {"name": "心靈療癒", "artist": "未知", "style": "輕音樂",
                    "mood": "療癒", "lyrics_hint": "正向鼓勵", "embed_url": ""}
            ]
        }

    # 搜尋 Spotify embed URL
    try:
        spotify_songs = []
        token = get_spotify_token()
        headers = {"Authorization": f"Bearer {token}"}
        for m in music_data["songs"]:
            query = f'track:"{m["name"]}" artist:"{m["artist"]}"'
            resp = requests.get(
                "https://api.spotify.com/v1/search",
                params={"q": query, "type": "track",
                        "limit": 1, "market": "TW"},
                headers=headers,
                timeout=5
            )
            tracks = resp.json().get("tracks", {}).get("items", [])
            if tracks:
                m["embed_url"] = f"https://open.spotify.com/embed/track/{tracks[0]['id']}"
                spotify_songs.append(m)  # 只加入有 Spotify 的歌曲
            else:
                m["embed_url"] = ""
    except Exception as e:
        print("Spotify API 錯誤:", e)
        for m in music_data["songs"]:
            m["embed_url"] = ""

    return {
        "status": "ok",
        "theme": music_data.get("theme", "心靈療癒"),
        "music": spotify_songs
    }


# ========= 登入 API =========
@app.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username
    password = form_data.password
    user = get_user_by_email(email)

    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return JSONResponse({"error": "帳號或密碼錯誤"}, status_code=401)

    access_token = create_access_token(data={"sub": user["email"]})
    response = JSONResponse(
        {"access_token": access_token, "token_type": "bearer"})
    response.set_cookie("token", access_token,
                        httponly=True, max_age=3600 * 24)
    return response

# ========= 取得使用者資訊 API =========


@app.get("/api/userinfo")
async def get_userinfo(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = get_user_by_email(email)
        if not user:
            return JSONResponse({"error": "使用者不存在"}, status_code=404)
        return {"email": user["email"], "name": user["name"]}
    except jwt.ExpiredSignatureError:
        return JSONResponse({"error": "Token 已過期"}, status_code=401)
    except jwt.InvalidTokenError:
        return JSONResponse({"error": "Token 無效"}, status_code=401)

# ========= 登出 =========


@app.post("/api/logout")
async def logout():
    response = JSONResponse({"message": "已登出"})
    response.delete_cookie("token")
    return response

# ========= 註冊 API =========
@app.get("/auth/google")
async def auth_google(request: Request):
    token = await oauth.google.authorize_access_token(request)
    resp = await oauth.google.get('https://openidconnect.googleapis.com/v1/userinfo', token=token)
    user_info = resp.json()
    # {"sub": "...", "email": "...", "name": "...", "picture": "..."}

    first_time = False  # 判斷是否第一次登入
    if not get_user_by_email(user_info["email"]):
        first_time = True
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (email, name) VALUES (%s, %s)",
            (user_info["email"], user_info["name"])
        )
        conn.commit()
        cursor.close()
        conn.close()

    # 如果是第一次登入，寄歡迎信
    if first_time:
        try:
            message = MessageSchema(
                subject="塔羅占卜網站 - 歡迎加入 🌟",
                recipients=[user_info["email"]],
                body=f"<h3>嗨 {user_info.get('name', '占卜者')}，</h3>"
                     f"<p>感謝使用 Google 帳號註冊塔羅占卜網站，歡迎開始你的靈性旅程！</p>",
                subtype="html"
            )
            fm = FastMail(conf)
            await fm.send_message(message)
        except Exception as e:
            print("寄送歡迎信失敗:", e)

    jwt_token = create_access_token(data={"sub": user_info["email"]})
    response = RedirectResponse(url="/")
    response.set_cookie("token", jwt_token, httponly=True, max_age=3600 * 24)
    return response

# ========= Google OAuth2 登入 =========


@app.get("/login/google")
async def login_google(request: Request):
    redirect_uri = "http://127.0.0.1:8000/auth/google"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google")
async def auth_google(request: Request):
    token = await oauth.google.authorize_access_token(request)
    resp = await oauth.google.get('https://openidconnect.googleapis.com/v1/userinfo', token=token)
    user_info = resp.json()
    # {"sub": "...", "email": "...", "name": "...", "picture": "..."}

    # 存入資料庫（若不存在）
    if not get_user_by_email(user_info["email"]):
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (email, name) VALUES (%s, %s)",
                       (user_info["email"], user_info["name"]))
        conn.commit()
        cursor.close()
        conn.close()

    jwt_token = create_access_token(data={"sub": user_info["email"]})
    response = RedirectResponse(url="/")
    response.set_cookie("token", jwt_token, httponly=True, max_age=3600 * 24)
    return response

# ========= 驗證登入狀態 =========


def get_current_user(token: str | None = Cookie(default=None)) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="未登入")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = get_user_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="使用者不存在")
        return User(email=user["email"], name=user["name"], picture=user.get("picture"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登入已過期")


@app.get("/api/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("LoginPage.html", {"request": request})
