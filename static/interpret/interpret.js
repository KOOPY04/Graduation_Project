console.log("🟢 Interpret JS loaded.");

function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");
    if (!modal || !msgBox || !btn) return;
    msgBox.textContent = msg;
    modal.style.display = "flex";
    btn.onclick = () => { modal.style.display = "none"; };
}

document.addEventListener("DOMContentLoaded", async () => {
    const spreadContainer = document.getElementById("spreadContainer");
    const urlParams = new URLSearchParams(window.location.search);
    const count = parseInt(urlParams.get("count"), 10) || 3;
    const categoryId = urlParams.get("category_id") || 1;

    spreadContainer.dataset.count = count;

    try {
        const res = await fetch("/api/interpret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId, count: count })
        });

        const data = await res.json();
        console.log("🔍 API Response:", data);

        if (data.status !== "ok" || !data.cards || data.cards.length === 0) {
            showAlert(data.msg || "取得牌義失敗！");
            return;
        }

        spreadContainer.innerHTML = "";

        if (count === 3) {
            // 三張牌：橫排
            data.cards.forEach(card => {
                const div = createCardElement(card);
                spreadContainer.appendChild(div);
            });
        } else if (count === 4) {
            // 四張牌：上排 1 張，下排 3 張
            const topCard = data.cards[0];
            const topWrapper = document.createElement("div");
            topWrapper.classList.add("top-card");
            topWrapper.appendChild(createCardElement(topCard));
            spreadContainer.appendChild(topWrapper);

            const bottomRow = document.createElement("div");
            bottomRow.classList.add("bottom-row");

            for (let i = 1; i < data.cards.length; i++) {
                const card = data.cards[i];
                bottomRow.appendChild(createCardElement(card));
            }

            spreadContainer.appendChild(bottomRow);
        }

    } catch (err) {
        console.error("❌ API Error:", err);
        showAlert("發生錯誤，請稍後再試！");
    }
});

// ✅ 抽出共用卡片建立函式
function createCardElement(card) {
    const div = document.createElement("div");
    div.classList.add("interpret-card");

    const positionLabel = document.createElement("div");
    positionLabel.classList.add("card-position");
    positionLabel.textContent = card.position_name;

    const img = document.createElement("img");
    img.src = card.image;
    if (card.position === "逆位") img.style.transform = "rotate(180deg)";

    const name = document.createElement("div");
    name.classList.add("card-name");
    name.textContent = `${card.name} (${card.position})`;

    const meaning = document.createElement("div");
    meaning.classList.add("card-meaning");
    meaning.textContent = card.meaning;

    div.appendChild(positionLabel);
    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(meaning);

    return div;
}
