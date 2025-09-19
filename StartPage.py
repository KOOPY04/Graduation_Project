import gradio as gr

# 按鈕功能
def go_to_divination():
    return gr.update(visible=True), gr.update(visible=False)

def show_instruction_popup():
    return gr.update(visible=True)

def close_instruction_popup():
    return gr.update(visible=False)

# 建立介面
with gr.Blocks(css="""
body {
  background-image: url('file/網站封面.jpg');
  background-size: cover;
  background-position: center;
  font-family: sans-serif;
}

#title {
  color: white;
  text-align: center;
  font-size: 48px;
  padding-top: 40px;
  text-shadow: 2px 2px 6px #000;
}

#main-buttons button {
  width: 200px;
  height: 50px;
  font-size: 18px;
  margin: 10px auto;
  display: block;
  border-radius: 10px;
}

/* 模擬彈出視窗 */
.popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0,0,0,0.4);
  z-index: 999;
  width: 400px;
  text-align: center;
}

.popup h3 {
  margin-bottom: 15px;
}

.popup button {
  margin-top: 20px;
}
""") as demo:

    # 標題
    gr.Markdown("## 🃏 Tarot 占卜首頁", elem_id="title")

    with gr.Column(elem_id="main-buttons"):
        start_btn = gr.Button("Start")
        instruction_btn = gr.Button("說明")

    # 占卜流程頁面
    with gr.Column(visible=False) as divination_page:
        gr.Markdown("### 占卜選擇頁（後續擴充）")
        gr.Markdown("👉 選擇大阿爾克那 / 小阿爾克那 / 開始抽牌")
        back_btn1 = gr.Button("返回首頁")

    # 模擬的說明彈出視窗
    with gr.Column(visible=False, elem_classes=["popup"]) as popup_window:
        gr.Markdown("### 🔮 使用說明")
        gr.Markdown("歡迎使用塔羅占卜網站！\n\n點選 Start 開始占卜，依據你選的牌陣顯示解釋。")
        close_popup_btn = gr.Button("關閉")

    # 功能綁定
    start_btn.click(fn=go_to_divination, inputs=[], outputs=[divination_page, start_btn])
    instruction_btn.click(fn=show_instruction_popup, inputs=[], outputs=[popup_window])
    close_popup_btn.click(fn=close_instruction_popup, inputs=[], outputs=[popup_window])

    back_btn1.click(fn=lambda: (gr.update(visible=False), gr.update(visible=True)),
                    inputs=[], outputs=[divination_page, start_btn])

demo.launch()
