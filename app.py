import gradio as gr
import random
import mysql.connector
from datetime import datetime

# 假設這是我們的牌庫（牌名 + 圖片連結）
TAROT_CARDS = [
    {"name": "愚者", "img": "https://upload.wikimedia.org/wikipedia/en/9/90/RWS_Tarot_00_Fool.jpg"},
    {"name": "魔術師", "img": "https://upload.wikimedia.org/wikipedia/en/d/de/RWS_Tarot_01_Magician.jpg"},
    {"name": "女祭司", "img": "https://upload.wikimedia.org/wikipedia/en/8/88/RWS_Tarot_02_High_Priestess.jpg"},
    {"name": "女皇", "img": "https://upload.wikimedia.org/wikipedia/en/d/d2/RWS_Tarot_03_Empress.jpg"},
    {"name": "皇帝", "img": "https://upload.wikimedia.org/wikipedia/en/c/c3/RWS_Tarot_04_Emperor.jpg"},
    {"name": "教皇", "img": "https://upload.wikimedia.org/wikipedia/en/8/8d/RWS_Tarot_05_Hierophant.jpg"},
    {"name": "戀人", "img": "https://upload.wikimedia.org/wikipedia/en/d/db/RWS_Tarot_06_Lovers.jpg"},
    {"name": "戰車", "img": "https://upload.wikimedia.org/wikipedia/en/3/3a/The_Chariot.jpg"}
]

CARD_BACK = "https://i.imgur.com/i7FJ1eB.jpg"

# 儲存占卜紀錄到 MySQL 資料庫
def save_to_mysql(question_type, selected_cards):
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",          # 預設帳號
            password="",          # 預設無密碼
            database="tarot"
        )
        cursor = conn.cursor()

        # 將選擇的牌組合成一個字串
        card_text = ", ".join(
            [f"{card['name']}（{'正位' if card['upright'] else '逆位'}）" for card in selected_cards]
        )
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 插入資料到 readings 表格
        sql = "INSERT INTO readings (timestamp, question_type, cards) VALUES (%s, %s, %s)"
        cursor.execute(sql, (now, question_type, card_text))

        conn.commit()
        cursor.close()
        conn.close()
        print("儲存成功！")
    except mysql.connector.Error as err:
        print(f"資料庫錯誤：{err}")

# 洗牌函數
def shuffle_cards():
    cards = random.sample(TAROT_CARDS, 3)
    # 隨機正逆位
    for card in cards:
        card["upright"] = random.choice([True, False])
    return [CARD_BACK]*3, cards, [], "請從牌中選擇 3 張。"

# 抽牌函數
def flip_card(idx, cards, selected):
    if idx in selected or len(selected) >= 3:
        return gr.update(), selected, f"已選 {len(selected)} 張。"
    selected.append(idx)
    card = cards[idx]
    label = f"{card['name']}（{'正位' if card['upright'] else '逆位'}）"
    return gr.update(value=card["img"], label=label), selected, f"你選擇了第 {len(selected)} 張牌。"

# Gradio 界面
with gr.Blocks() as demo:
    gr.Markdown("## 三張牌占卜：過去、現在、未來")

    # 問題分類選單
    question_type = gr.Dropdown(
        label="問題類別", 
        choices=["感情", "事業", "財運", "運勢", "學業"], 
        value="感情"
    )

    shuffle_btn = gr.Button("洗牌並開始抽牌")
    status = gr.Textbox(label="狀態提示", interactive=False)

    with gr.Row():
        card1 = gr.Image(label="過去", interactive=True)
        card2 = gr.Image(label="現在", interactive=True)
        card3 = gr.Image(label="未來", interactive=True)

    cards_state = gr.State([])
    selected_state = gr.State([])

    # 洗牌：初始化狀態
    shuffle_btn.click(
        fn=shuffle_cards,
        outputs=[card1, card2, card3, cards_state, selected_state, status]
    )

    # 點選三張牌
    card1.select(fn=lambda _, c, s: flip_card(0, c, s), inputs=[card1, cards_state, selected_state], outputs=[card1, selected_state, status])
    card2.select(fn=lambda _, c, s: flip_card(1, c, s), inputs=[card2, cards_state, selected_state], outputs=[card2, selected_state, status])
    card3.select(fn=lambda _, c, s: flip_card(2, c, s), inputs=[card3, cards_state, selected_state], outputs=[card3, selected_state, status])

    # 儲存結果到資料庫
    save_btn = gr.Button("解牌並儲存結果")
    save_btn.click(
        fn=lambda question, cards: save_to_mysql(question, cards),
        inputs=[question_type, cards_state],
        outputs=status
    )

demo.launch()
