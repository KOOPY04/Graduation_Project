# StartPage.py
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import mysql.connector

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
async def tarot(request: Request, count: int = 4, category_id: int = None, subquestion_id: int = None):
    slot_titles = ["過去", "現在", "未來"] if count == 3 else ["問題核心", "障礙或短處", "對策", "資源或長處"]
    from tarot_ui import generate_tarot_html
    tarot_html = generate_tarot_html(slot_titles)
    return templates.TemplateResponse("DrawCard.html", {
        "request": request,
        "tarot_html": tarot_html,
        "category_id": category_id,
        "subquestion_id": subquestion_id
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
