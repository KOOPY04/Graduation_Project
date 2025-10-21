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
from fastapi import FastAPI, Request, Form, Depends, HTTPException, Cookie, Body
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from authlib.integrations.starlette_client import OAuth
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware
from typing import Any
import json

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
    "user": "root",
    "password": "",  # 改成你的密碼
    "database": "tarot_db"
}


# ========= 安全設定 =========
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小時
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL")

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
    user_id: int
    email: str
    name: str
    picture: str | None = None


class UserOut(BaseModel):
    user_id: int
    email: str
    name: str
    picture: str | None = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    type: str = "其他"
    message: str


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

# ===== 塔羅紀錄頁 =====


@app.get("/records", response_class=HTMLResponse)
async def records_page(request: Request):
    return templates.TemplateResponse("RecordPage.html", {"request": request})

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

    cursor.close()
    conn.close()
    return {"status": "ok", "cards": result, "count": count}

# ===== API: GPT 占卜總結 =====


@app.post("/api/summary")
async def tarot_summary(request: Request):
    try:
        data = await request.json()
        # print("Request JSON:", data)
        category_name = data.get("category_name")
        subquestion = data.get("subquestion_text")
        cards = data.get("cards", [])

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

            問題：{category_name}
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
    category_name = data.get("category_name", "")

    if not tarot_summary:
        return {"status": "error", "msg": "缺少塔羅總結內容"}

    # 🧠 GPT prompt: 生成總主題 + 3~5 首符合塔羅總結情緒的中文歌曲
    prompt = f"""
你是一位專業的音樂心理分析師，根據以下塔羅占卜總結、問題類型和子問題挑選歌詞詞意符合的3~5首歌曲。
歌曲任何語言都可以推薦，推薦多元文化音樂風格。
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
問題類型：
{category_name}
子問題：
{subquestion}
"""
    try:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "你是一位能讀懂情緒並推薦歌曲的分析師"},
                {"role": "user", "content": prompt}
            ],
        )
        music_data = json.loads(response.choices[0].message.content.strip())
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

    print("生成的音樂資料:", music_data.get("theme"),
          "首數:", len(music_data.get("songs", [])))
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
                        "limit": 1},
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


# ========= 驗證登入狀態 =========


# def get_current_user(token: str | None = Cookie(default=None)) -> User:
#     if not token:
#         raise HTTPException(status_code=401, detail="未登入")
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         email = payload.get("sub")
#         user = get_user_by_email(email)
#         if not user:
#             raise HTTPException(status_code=404, detail="使用者不存在")
#         return User(email=user["email"], name=user["name"], picture=user.get("picture"))
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=401, detail="登入已過期")

def get_current_user(token: str | None = Cookie(default=None)) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="未登入")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user_row = get_user_by_email(email)
        if not user_row:
            raise HTTPException(status_code=404, detail="使用者不存在")
        return User(
            user_id=user_row["id"],   # ⚡ 這裡加上 id
            email=user_row["email"],
            name=user_row["name"],
            picture=user_row.get("picture")
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登入已過期")


@app.get("/api/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    print("目前使用者:", user)
    # user 物件本身可以帶 id
    return UserOut(
        user_id=user.user_id,       # <-- 確認 User model 有 id
        email=user.email,
        name=user.name,
        picture=user.picture
    )


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("LoginPage.html", {"request": request})


@app.post("/api/register")
async def register(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "")

    if not email or not password:
        return JSONResponse({"error": "Email 與密碼必填"}, status_code=400)

    if get_user_by_email(email):
        return JSONResponse({"error": "Email 已被註冊"}, status_code=400)

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s)",
        (email, hashed, name)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "註冊成功 🎉"}


class Card(BaseModel):
    name: str
    orientation: str  # 正位/逆位


class TarotRecordCreate(BaseModel):
    user_id: int
    question: str
    subquestion: Optional[str] = ""
    selected_cards: List[Card]
    summary: Optional[str] = ""
    music: Optional[Any] = None


class TarotRecord(TarotRecordCreate):
    id: int
    created_at: datetime

# ===== API: 取得使用者塔羅紀錄 =====


@app.get("/api/tarot-records/{user_id}")
def get_records(user_id: int):
    try:
        conn = mysql.connector.connect(**db_config)  # ✅ 正確寫法
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM tarot_records WHERE user_id=%s ORDER BY created_at DESC",
            (user_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # 將 selected_cards 與 music 由 JSON 字串轉回物件
        for row in rows:
            if isinstance(row.get("selected_cards"), str):
                row["selected_cards"] = json.loads(row["selected_cards"])
            if isinstance(row.get("music"), str):
                row["music"] = json.loads(row["music"])

        return rows
    except Exception as e:
        print("抓取塔羅紀錄錯誤:", e)
        raise HTTPException(status_code=500, detail="抓取紀錄失敗")


# ===== API: 取得單筆塔羅紀錄 =====
@app.get("/api/tarot-record/{record_id}")
def get_record(record_id: int):
    try:
        conn = mysql.connector.connect(**db_config)  # ✅ 修正
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM tarot_records WHERE id=%s", (record_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Record not found")

        # JSON 字串轉物件
        if isinstance(row.get("selected_cards"), str):
            row["selected_cards"] = json.loads(row["selected_cards"])
        if isinstance(row.get("music"), str):
            row["music"] = json.loads(row["music"])

        return row
    except Exception as e:
        print("抓取單筆紀錄錯誤:", e)
        raise HTTPException(status_code=500, detail="抓取紀錄失敗")

# ===== 儲存塔羅紀錄 API =====


@app.post("/api/tarot-records")
async def save_tarot_record(data: dict = Body(...)):
    required_fields = ["user_id", "category", "selected_cards"]
    for field in required_fields:
        if field not in data:
            return JSONResponse({"error": f"缺少欄位 {field}"}, status_code=400)

    user_id = data["user_id"]
    category = data["category"]
    subquestion = data.get("subquestion", "")
    selected_cards = json.dumps(data["selected_cards"], ensure_ascii=False)
    summary = data.get("summary", "")
    music = json.dumps(data.get("music", {}), ensure_ascii=False)
    # print("儲存塔羅紀錄資料:", data)
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """
            INSERT INTO tarot_records
            (user_id, category, subquestion, selected_cards, summary, music)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (user_id, category, subquestion,
                       selected_cards, summary, music))
        conn.commit()
        record_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {"status": "ok", "record_id": record_id}
    except Exception as e:
        print("儲存塔羅紀錄錯誤:", e)
        return JSONResponse({"error": "儲存失敗"}, status_code=500)


@app.post("/api/profile")
async def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user)):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    updates = []
    params = []
    if data.name:
        updates.append("name=%s")    # 對應資料庫欄位
        params.append(data.name)
    if not updates:
        return JSONResponse({"message": "沒有要更新的資料"}, status_code=400)

    params.append(user.user_id)
    sql = f"UPDATE users SET {', '.join(updates)} WHERE id=%s"
    cursor.execute(sql, params)
    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "個人資料已更新"}

# @app.post("/api/avatar")
# async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
#     upload_dir = "static/uploads"
#     os.makedirs(upload_dir, exist_ok=True)
#     file_path = os.path.join(upload_dir, f"{user.user_id}_{file.filename}")

#     with open(file_path, "wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)

#     conn = mysql.connector.connect(**db_config)
#     cursor = conn.cursor()
#     cursor.execute("UPDATE users SET picture=%s WHERE id=%s", (f"/{file_path.replace(os.sep,'/')}", user.user_id))
#     conn.commit()
#     cursor.close()
#     conn.close()

#     return {"message": "頭像已更新", "avatar": f"/{file_path.replace(os.sep,'/')}"}


@app.post("/api/password")
async def update_password(data: PasswordUpdate, user: User = Depends(get_current_user)):
    # 先比對舊密碼
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT password_hash FROM users WHERE id=%s", (user.user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row or not bcrypt.checkpw(data.old_password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=400, detail="舊密碼錯誤")

    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="新密碼與確認密碼不一致")

    new_hash = bcrypt.hashpw(data.new_password.encode(),
                             bcrypt.gensalt()).decode()
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash=%s WHERE id=%s",
                   (new_hash, user.user_id))
    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "密碼已更新成功"}


@app.post("/contact")
async def contact_form(
    name: str = Form(...),
    email: str = Form(...),
    type: str = Form(...),
    message: str = Form(...)
):
    try:
        # 建立 HTML 郵件
        msg = MIMEMultipart()
        msg["From"] = SMTP_USER
        msg["To"] = SUPPORT_EMAIL
        msg["Reply-To"] = email  # 使用者填寫的 Email
        msg["Subject"] = f"客服聯絡表單：{type}問題"

        # HTML 內容
        body = f"""
        <html>
        <body>
            <p><b>用戶:</b> {name}<br>
            <b>Email:</b> {email}</p>
            <p><b>問題類型:</b> {type}<br>
            <b>訊息內容:</b><br>{message.replace('\n', '<br>')}</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, "html"))

        # 使用 Gmail SMTP 發送
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, SUPPORT_EMAIL, msg.as_string())

        return JSONResponse(content={"success": True, "message": "已成功寄送給客服"})

    except Exception as e:
        return JSONResponse(content={"success": False, "message": str(e)})