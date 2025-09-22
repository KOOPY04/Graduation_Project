#  tarot_ui.py
import math

card_back_url = "/static/images/card_back.png"

def generate_tarot_html(slot_titles):
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

    # 扇形牌陣
    html = "<div class='wrapper'><div class='fan-container'>"
    for i in range(total_cards):
        angle_deg = angle_start + i * angle_step
        angle_rad = math.radians(angle_deg)
        x = center_x + radius * math.sin(angle_rad) - card_width / 2
        y = center_y - radius * math.cos(angle_rad)
        html += f"""
        <img src='{card_back_url}' class='card' data-index='{i}'
             style='transform: rotate({angle_deg}deg); z-index:{i}; left:{x}px; top:{y}px;' />
        """
    html += "</div></div>"

    # slot 區域
    html += f"<div class='spread' data-count='{len(slot_titles)}'>"
    if len(slot_titles) == 4:
        html += f"<div class='slot slot-top' id='slot0'>{slot_titles[0]}</div>"
        html += "<div class='slot-row'>"
        for i, title in enumerate(slot_titles[1:], start=1):
            html += f"<div class='slot' id='slot{i}'>{title}</div>"
        html += "</div>"
    else:
        html += "<div class='slot-row'>"
        for i, title in enumerate(slot_titles):
            html += f"<div class='slot' id='slot{i}'>{title}</div>"
        html += "</div>"
    html += "</div>"

    # 解牌按鈕
    html += """
    <div class='button-container'>
        <button class='interpret-button' id='interpretBtn'>解牌</button>
    </div>
    """
    return html
