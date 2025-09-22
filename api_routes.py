# api_routes.py
from fastapi import APIRouter, Request

router = APIRouter()

CARD_IMAGES = [f"/static/images/cards/{i}.png" for i in range(78)]
SLOT_TITLES = ["問題核心", "障礙或短處", "對策", "資源或長處"]

@router.post("/select_card")
async def select_card(request: Request):
    data = await request.json()
    selected = data.get("selected", [])
    max_select = data.get("maxSelect", 4)  # 前端傳 maxSelect, 預設 4

    # 嚴格檢查選牌數
    if not isinstance(selected, list) or len(selected) > max_select:
        return {
            "status": "error",
            "msg": f"選牌數量超過限制！最多只能選 {max_select} 張牌"
        }

    slots = []
    for i, idx in enumerate(selected):
        if i >= max_select:
            break
        slots.append({
            "src": CARD_IMAGES[int(idx) % 78],
            "title": SLOT_TITLES[i]
        })

    return {"status": "ok", "slots": slots}
