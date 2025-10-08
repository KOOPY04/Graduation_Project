import gradio as gr
import mysql.connector
import random

# 建立資料庫連線
def connect_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",        # 如有密碼請填入
        database="tarot_db"    # 改成你的資料庫名稱
    )

# 取得所有類別（dropdown 使用）
def get_categories():
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, name FROM categories")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return {item["name"]: item["id"] for item in data}

# 根據類別 ID 取得子問題（dropdown 使用）
def get_subquestions_by_category(category_name):
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)

    # 找出類別 id
    cursor.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
    cat = cursor.fetchone()
    if not cat:
        return []
    category_id = cat["id"]

    # 找出該類別下的子問題
    cursor.execute("SELECT question FROM subquestions WHERE category_id = %s", (category_id,))
    subqs = cursor.fetchall()

    cursor.close()
    conn.close()
    return [item["question"] for item in subqs]

# 執行占卜
def draw_cards(category_name, subquestion_text):
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)

    # 找類別 ID
    cursor.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
    cat = cursor.fetchone()
    if not cat:
        return "❌ 找不到類別"
    category_id = cat["id"]

    # 找卡牌（隨機抽三張）
    cursor.execute("SELECT * FROM cards ORDER BY RAND() LIMIT 3")
    cards = cursor.fetchall()

    result = [f"🔮 問題子題：{subquestion_text}\n"]
    for i, card in enumerate(cards):
        is_upright = random.choice([True, False])

        # 查找正/逆位牌義
        cursor.execute(
            "SELECT upright_meaning, reversed_meaning FROM card_meanings WHERE card_id = %s AND category_id = %s",
            (card["id"], category_id)
        )
        meaning = cursor.fetchone()
        if not meaning:
            meaning_text = "❌ 沒有對應的牌義"
        else:
            meaning_text = meaning["upright_meaning"] if is_upright else meaning["reversed_meaning"]

        result.append(
            f"第{i+1}張：{card['name']}（{'正位' if is_upright else '逆位'}）\n{meaning_text}\n"
        )

    cursor.close()
    conn.close()
    return "\n".join(result)

# 初始化類別
category_options = get_categories()

# 建立 Gradio 介面
with gr.Blocks() as demo:
    gr.Markdown("## 🃏 塔羅牌占卜系統")

    category_dropdown = gr.Dropdown(
        choices=list(category_options.keys()), label="請選擇問題類別"
    )

    subquestion_dropdown = gr.Dropdown(
        choices=[], label="請選擇子問題"
    )

    output_box = gr.Textbox(label="占卜結果", lines=15)

    start_button = gr.Button("開始占卜")

    # 當類別改變時更新子問題選項
    def update_subquestions(category_name):
        return gr.update(choices=get_subquestions_by_category(category_name), value=None)

    category_dropdown.change(fn=update_subquestions, inputs=category_dropdown, outputs=subquestion_dropdown)

    # 按下按鈕執行占卜
    start_button.click(
        fn=draw_cards,
        inputs=[category_dropdown, subquestion_dropdown],
        outputs=output_box
    )

demo.launch()
