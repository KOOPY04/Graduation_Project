
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
    const count = parseInt(spreadContainer.dataset.count) || 3;
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get("category_id") || 1;

    try {
        const res = await fetch("/api/interpret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId, count: count })
        });
        const data = await res.json();
        if (data.status !== "ok") { showAlert(data.msg || "取得牌義失敗！"); return; }

        // ✅ 先渲染牌面
        renderCards(spreadContainer, data.cards, count);

        // ✅ GPT 總結按鈕事件（懶加載）
        setupSummaryButton(data.cards);

    } catch (err) {
        console.error(err);
        showAlert("發生錯誤，請稍後再試！");
    }
});

// 將牌面渲染拆出
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
        topImg.loading = "lazy"; // 🔹 加快載入
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

// 設定總結按鈕事件（懶加載 GPT）
// 設定總結按鈕事件（懶加載 GPT）
function setupSummaryButton(cards) {
    const toggleBtn = document.getElementById("toggleSummaryBtn");
    const summarySection = document.getElementById("summarySection");
    // const summaryText = document.getElementById("summaryText");

    // 🔹 用布林變數控制是否已生成
    let summaryLoaded = false;

    toggleBtn.style.display = "inline-block";
    toggleBtn.onclick = async () => {
        toggleBtn.style.display = "none";  // 按鈕消失
        summarySection.style.display = "block"; // 顯示總結區

        console.log("🔮 Summary section shown.");

        if (!summaryLoaded) {
            console.log("🔮 Summary not loaded yet. Generating...");
            await generateSummary(cards);
            summaryLoaded = true;
            console.log("🔮 Summary generated.");
        } else {
            console.log("🔮 Summary already loaded, skipping generation.");
        }
    };
}


async function generateSummary(cards) {
    const summaryText = document.getElementById("summaryText");
    const urlParams = new URLSearchParams(window.location.search);
    const question = urlParams.get("category") || "一般問題";
    const subquestion = urlParams.get("subquestion") || "";

    try {
        const res = await fetch("/api/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, subquestion, cards })
        });

        if (!res.ok) throw new Error("網路或伺服器錯誤");

        const data = await res.json();
        if (data.status === "ok") {
            // ✅ 插入 HTML
            summaryText.innerHTML = data.summary;

            // ✅ 取得所有 <p>，依序延遲淡入
            const paragraphs = summaryText.querySelectorAll("p");
            paragraphs.forEach((p, i) => {
                setTimeout(() => {
                    // 加上 show class 淡入
                    p.classList.add("show");

                    // 自動滾動到該段落，平滑效果
                    p.scrollIntoView({ behavior: "smooth", block: "center" });

                }, i * 500); // 每段落延遲 0.5 秒
            });

        } else {
            summaryText.textContent = "生成失敗：" + (data.msg || "");
        }
        summaryText.dataset.loaded = true;

    } catch (err) {
        console.error(err);
        summaryText.textContent = "⚠️ 發生錯誤，請稍後再試。";
        summaryText.dataset.loaded = true;
    }
}

