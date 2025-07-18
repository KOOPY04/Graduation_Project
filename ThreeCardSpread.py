from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import gradio as gr
import math

app = FastAPI()

app.mount("/images", StaticFiles(directory="images"), name="images")

selected_cards = []
card_back_url = "/images/card_back.png"

# HTML 生成函數
def tarot_fan_html():
    total_cards = 78
    card_width = 100
    card_height = 160
    container_width = 1200
    radius = 600
    center_x = container_width / 2
    center_y = 580
    angle_start = -40
    angle_end = 40

    angle_step = (angle_end - angle_start) / (total_cards - 1)
    html = "<div class='wrapper'><div class='fan-container'>"
    for i in range(total_cards):
        angle_deg = angle_start + i * angle_step
        angle_rad = math.radians(angle_deg)

        x = center_x + radius * math.sin(angle_rad) - card_width / 2
        y = center_y - radius * math.cos(angle_rad)

        html += f"""
<img src='{card_back_url}' class='card' onclick='selectCard({i})' style='transform: rotate({angle_deg}deg); z-index:{i}; left:{x}px; top:{y}px;' />
"""
    html += "</div></div>"

    # 三張牌陣框 HTML - 過去現在未來
    html += """
<div class='spread'>
    <div class='slot-row'>
        <div class='slot' id='slot0'>過去</div>
        <div class='slot' id='slot1'>現在</div>
        <div class='slot' id='slot2'>未來</div>
    </div>
</div>
<div class='button-container'>
    <button class='interpret-button' onclick='interpret()'>解牌</button>
</div>

<script>
let selected = [];
function selectCard(index) {
    if (selected.length >= 3) return;
    const card = document.getElementsByClassName('card')[index];
    const clone = card.cloneNode(true);
    clone.style = '';
    clone.style.width = '100px';
    clone.style.height = '160px';
    clone.style.transform = 'none';
    clone.style.margin = '0 auto';
    document.getElementById('slot' + selected.length).innerHTML = '';
    document.getElementById('slot' + selected.length).appendChild(clone);
    selected.push(index);
}
function interpret() {
    if (selected.length < 3) {
        alert("請先選擇三張牌再進行解牌！");
        return;
    }
    const positions = ["過去", "現在", "未來"];
    let message = "解牌結果：\n";
    for (let i = 0; i < selected.length; i++) {
        message += positions[i] + "：第" + (selected[i] + 1) + "張牌\n";
    }
    alert(message);
}
</script>
"""

    # CSS
    style = f"""
<style>
    .wrapper {{
        display: flex;
        justify-content: center;
        width: 100%;
    }}
    .fan-container {{
        position: relative;
        height: 160px;
        width: {container_width}px;
        margin-top: 23px;
        overflow-x: visible;
    }}
    .card {{
        position: absolute;
        width: {card_width}px;
        height: {card_height}px;
        transition: transform 0.3s ease, box-shadow 0.3s ease, z-index 0.3s ease;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        border-radius: 8px;
        transform-origin: bottom center;
        cursor: pointer;
    }}
    .card:hover {{
        transform: scale(1.0) translateY(-10px) !important;
        z-index: 999 !important;
        box-shadow: 0 15px 25px rgba(0,0,0,0.4);
        cursor: pointer;
    }}
    .spread {{
        text-align: center;
        margin-top: 30px;
    }}
    .slot-row {{
        display: flex;
        justify-content: center;
        gap: 60px;
        margin-top: 20px;
    }}
    .slot {{
        width: {card_width}px;
        height: {card_height}px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 15px;
        border-radius: 8px;
        box-shadow: inset 0 0 5px #999;
    }}
    .button-container {{
        text-align: center;
        margin-top: 30px;
    }}
    .interpret-button {{
        padding: 13px 26px !important;
        font-size: 15px !important;
        border: none;
        background-color: #5e3370 !important;
        color: white !important;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.2s ease;
    }}
    .interpret-button:hover {{
        background-color: #a678b2 !important;
        transform: scale(1.05);
    }}
</style>
"""
    return style + html

demo = gr.Blocks()
with demo:
    gr.Markdown("## 扇形塔羅牌展示 + 過去現在未來三張牌陣 + 解牌")
    gr.HTML(tarot_fan_html())

gr.mount_gradio_app(app, demo, path="/gradio")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7860)