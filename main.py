from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from tarot_ui import generate_tarot_html

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")  # 靜態資源掛載
templates = Jinja2Templates(directory="templates")  # 模板目錄

# 首頁路由
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("HomePage.html", {"request": request})

# 抽牌頁路由
@app.get("/tarot", response_class=HTMLResponse)
async def tarot(request: Request, count: int = 4):
    # 根據 count 決定 slot 標題
    if count == 3:
        slot_titles = ["過去", "現在", "未來"]
    else:
        slot_titles = ["問題核心", "障礙或短處", "對策", "資源或長處"]

    tarot_html = generate_tarot_html(slot_titles)  # 產生扇形牌陣 HTML
    return templates.TemplateResponse(
        "DrawCard.html",
        {"request": request, "tarot_html": tarot_html}
    )
