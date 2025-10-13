console.log("🟢 Interpret JS loaded.");

// 顯示錯誤訊息
function showAlert(message) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");
    if (!modal || !msgBox || !btn) { alert(message); return; }

    msgBox.textContent = message;
    modal.style.display = "flex";
    btn.onclick = () => { modal.style.display = "none"; };
}

// DOM 載入
document.addEventListener("DOMContentLoaded", async () => {
    const spreadContainer = document.getElementById("spreadContainer");
    const count = parseInt(sessionStorage.getItem("count"), 10) || 3;
    const categoryId = sessionStorage.getItem("category_id");
    const subquestionText = sessionStorage.getItem("subquestion_text");
    console.log("Retrieved from sessionStorage:", { count, categoryId, subquestionText });

    if (!categoryId || !subquestionText) {
        showAlert("缺少問題資料，請回主頁重新選擇！");
        window.location.href = "/";
        return;
    }

    spreadContainer.dataset.count = count;

    try {
        const res = await fetch("/api/interpret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId, subquestion_text: subquestionText, count })
        });

        const data = await res.json();
        console.log("🔍 API Response:", data);

        if (data.status !== "ok" || !data.cards || data.cards.length === 0) {
            showAlert(data.msg || "取得牌義失敗！");
            return;
        }

        // 渲染牌面
        renderCards(spreadContainer, data.cards, count);

        // GPT 總結按鈕事件
        setupSummaryButton(data.cards);

    } catch (err) {
        console.error(err);
        showAlert("發生錯誤，請稍後再試！");
    }
});

// 渲染牌面
function renderCards(container, cards, count) {
    container.innerHTML = "";

    if (count === 3) {
        cards.forEach(card => container.appendChild(createCardDiv(card)));
    } else if (count === 4) {
        // 上排
        const topCard = cards[0];
        const topDiv = document.createElement("div");
        topDiv.classList.add("interpret-card", "first-card");

        const leftDiv = document.createElement("div");
        leftDiv.style.display = "flex";
        leftDiv.style.flexDirection = "column";
        leftDiv.style.alignItems = "center";

        const positionLabel = document.createElement("div");
        positionLabel.classList.add("card-position");
        positionLabel.textContent = topCard.position_name;

        const topImg = new Image();
        topImg.src = topCard.image;
        topImg.loading = "lazy";
        if (topCard.position === "逆位") topImg.style.transform = "rotate(180deg)";

        const topName = document.createElement("div");
        topName.classList.add("card-name");
        topName.textContent = `${topCard.name} (${topCard.position})`;

        leftDiv.appendChild(positionLabel);
        leftDiv.appendChild(topImg);
        leftDiv.appendChild(topName);

        const rightDiv = document.createElement("div");
        rightDiv.style.display = "flex";
        rightDiv.style.flexDirection = "column";
        rightDiv.style.justifyContent = "center";
        rightDiv.style.maxWidth = "300px";

        const topMeaning = document.createElement("div");
        topMeaning.classList.add("card-meaning");
        topMeaning.textContent = topCard.meaning;
        rightDiv.appendChild(topMeaning);

        topDiv.appendChild(leftDiv);
        topDiv.appendChild(rightDiv);
        container.appendChild(topDiv);

        // 下排
        const bottomRow = document.createElement("div");
        bottomRow.classList.add("bottom-row");
        for (let i = 1; i < cards.length; i++)
            bottomRow.appendChild(createCardDiv(cards[i]));
        container.appendChild(bottomRow);
    }
}

// 建立單張卡牌 DOM
function createCardDiv(card) {
    const div = document.createElement("div");
    div.classList.add("interpret-card");

    const posLabel = document.createElement("div");
    posLabel.classList.add("card-position");
    posLabel.textContent = card.position_name;

    const img = new Image();
    img.src = card.image;
    img.loading = "lazy";
    if (card.position === "逆位") img.style.transform = "rotate(180deg)";

    const name = document.createElement("div");
    name.classList.add("card-name");
    name.textContent = `${card.name} (${card.position})`;

    const meaning = document.createElement("div");
    meaning.classList.add("card-meaning");
    meaning.textContent = card.meaning;

    div.appendChild(posLabel);
    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(meaning);

    return div;
}

function setupSummaryButton(cards) {
    const toggleBtn = document.getElementById("toggleSummaryBtn");
    const modal = document.getElementById("summaryModal");
    const closeBtn = document.getElementById("closeSummaryBtn");
    const summaryText = document.getElementById("summaryText");
    let summaryLoaded = false;

    // 打開 modal
    toggleBtn.onclick = async () => {
        document.getElementById('summaryModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (!summaryLoaded) {
            await generateSummary(cards, summaryText);
            summaryLoaded = true;
        }
    };

    // 關閉 modal
    closeBtn.onclick = () => {
        modal.style.display = "none";
    };

    // 點擊 modal 背景也可以關閉
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
        document.body.style.overflow = 'auto';
    };
}

// GPT 生成總結
async function generateSummary(cards, summaryText) {
    const categoryId = sessionStorage.getItem("category_id");
    const subquestionText = sessionStorage.getItem("subquestion_text");

    try {
        const res = await fetch("/api/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId, subquestion_text: subquestionText, cards })
        });

        const data = await res.json();

        if (data.status === "ok") {
            summaryText.innerHTML = data.summary;

            // 段落漸入動畫
            const paragraphs = summaryText.querySelectorAll("p");
            paragraphs.forEach((p, i) => {
                setTimeout(() => {
                    p.classList.add("show");  // 淡入
                    p.scrollIntoView({ behavior: "smooth", block: "center" });
                }, i * 1000); // 每段落延遲 0.5 秒
            });
        } else {
            summaryText.textContent = "生成失敗：" + (data.msg || "");
        }
    } catch (err) {
        console.error(err);
        summaryText.textContent = "⚠️ 發生錯誤，請稍後再試。";
    }
}
