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

        spreadContainer.innerHTML = "";

        if (count === 3) {
            // 過去、現在、未來橫排
            data.cards.forEach(card => {
                const div = document.createElement("div");
                div.classList.add("interpret-card");

                // 牌位置標題
                const positionLabel = document.createElement("div");
                positionLabel.classList.add("card-position");
                positionLabel.textContent = card.position_name; // 從 API 拿的位置文字

                const img = document.createElement("img");
                img.src = card.image;
                if (card.position === "逆位") img.style.transform = "rotate(180deg)";

                const name = document.createElement("div");
                name.classList.add("card-name");
                name.textContent = card.name + " (" + card.position + ")";

                const meaning = document.createElement("div");
                meaning.classList.add("card-meaning");
                meaning.textContent = card.meaning;

                div.appendChild(positionLabel);
                div.appendChild(img);
                div.appendChild(name);
                div.appendChild(meaning);

                spreadContainer.appendChild(div);
            });
        } else if (count === 4) {
            // 四張牌：上排 1，下排 3
            const topPositionLabel = document.createElement("div");
            topPositionLabel.classList.add("card-position");
            const topCard = data.cards[0];
            topPositionLabel.textContent = topCard.position_name;
            const topDiv = document.createElement("div");
            topDiv.classList.add("interpret-card");
            const topImg = document.createElement("img");
            topImg.src = topCard.image;
            if (topCard.position === "逆位") topImg.style.transform = "rotate(180deg)";
            const topName = document.createElement("div");
            topName.classList.add("card-name");
            topName.textContent = topCard.name + " (" + topCard.position + ")";
            const topMeaning = document.createElement("div");
            topMeaning.classList.add("card-meaning");
            topMeaning.textContent = topCard.meaning;
            topDiv.appendChild(topPositionLabel);
            topDiv.appendChild(topImg);
            topDiv.appendChild(topName);
            topDiv.appendChild(topMeaning);
            spreadContainer.appendChild(topDiv);

            const bottomRow = document.createElement("div");
            bottomRow.classList.add("bottom-row");
            for (let i = 1; i < data.cards.length; i++) {
                const positionLabel = document.createElement("div");
                positionLabel.classList.add("card-position");
                positionLabel.textContent = data.cards[i].position_name;

                const c = data.cards[i];
                const div = document.createElement("div");
                div.classList.add("interpret-card");

                const img = document.createElement("img");
                img.src = c.image;
                if (c.position === "逆位") img.style.transform = "rotate(180deg)";

                const name = document.createElement("div");
                name.classList.add("card-name");
                name.textContent = c.name + " (" + c.position + ")";

                const meaning = document.createElement("div");
                meaning.classList.add("card-meaning");
                meaning.textContent = c.meaning;

                div.appendChild(positionLabel);
                div.appendChild(img);
                div.appendChild(name);
                div.appendChild(meaning);

                bottomRow.appendChild(div);
            }
            spreadContainer.appendChild(bottomRow);
        }

    } catch (err) {
        console.error(err);
        showAlert("發生錯誤，請稍後再試！");
    }
});
