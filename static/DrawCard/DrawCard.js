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
            data.cards.forEach(card => {
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
            // 上排第一張
            const topCard = data.cards[0];
            const topDiv = document.createElement("div");
            topDiv.classList.add("interpret-card", "first-card");

            const positionLabel = document.createElement("div");
            positionLabel.classList.add("card-position");
            positionLabel.textContent = topCard.position_name;

            const img = document.createElement("img");
            img.src = topCard.image;
            if (topCard.position === "逆位") img.style.transform = "rotate(180deg)";

            const name = document.createElement("div");
            name.classList.add("card-name");
            name.textContent = topCard.name + " (" + topCard.position + ")";

            const meaning = document.createElement("div");
            meaning.classList.add("card-meaning");
            meaning.textContent = topCard.meaning;

            topDiv.appendChild(positionLabel);
            topDiv.appendChild(img);
            topDiv.appendChild(name);
            topDiv.appendChild(meaning);
            spreadContainer.appendChild(topDiv);

            // 下排三張
            const bottomRow = document.createElement("div");
            bottomRow.classList.add("bottom-row");
            for (let i = 1; i < data.cards.length; i++) {
                const c = data.cards[i];
                const div = document.createElement("div");
                div.classList.add("interpret-card");

                const posLabel = document.createElement("div");
                posLabel.classList.add("card-position");
                posLabel.textContent = c.position_name;

                const img = document.createElement("img");
                img.src = c.image;
                if (c.position === "逆位") img.style.transform = "rotate(180deg)";

                const name = document.createElement("div");
                name.classList.add("card-name");
                name.textContent = c.name + " (" + c.position + ")";

                const meaning = document.createElement("div");
                meaning.classList.add("card-meaning");
                meaning.textContent = c.meaning;

                div.appendChild(posLabel);
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
