console.log("🟢 Tarot JS loaded.");
<<<<<<< HEAD

// 自訂警示框
=======
// 顯示自訂警示框
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");

    if (!modal || !msgBox || !btn) {
        console.error("customAlert 元素未找到！");
        return;
    }

    msgBox.textContent = msg;
    modal.style.display = "flex";

    btn.onclick = () => {
        modal.style.display = "none";
    };
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 Tarot JS running...");

    const spread = document.querySelector(".spread");
    if (!spread) {
        console.warn("spread 元素未找到！");
        return;
    }

    const maxSelect = parseInt(spread.dataset.count) || 4;
    let selected = [];

    const cards = document.querySelectorAll(".card");
<<<<<<< HEAD
    const interpretBtn = document.getElementById("interpretBtn");

    // 從 URL 拿 category_id、subquestion_id
    const urlParams = new URLSearchParams(window.location.search);
    const category_id = urlParams.get("category_id") || "";
    const subquestion_id = urlParams.get("subquestion_id") || "";

    if (!category_id || !subquestion_id) {
        showAlert("錯誤：缺少 category_id 或 subquestion_id！");
        return;
    }

    // 點選卡牌
=======
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
    cards.forEach(card => {
        card.addEventListener("click", () => {
            const index = card.dataset.index;

            if (selected.includes(index)) return;

            if (selected.length >= maxSelect) {
                showAlert(`已經選滿 ${maxSelect} 張牌，可以開始解牌！`);
                return;
            }

            const clone = card.cloneNode(true);
            clone.style = "";
            clone.style.width = "100px";
            clone.style.height = "160px";
            clone.style.transform = "none";
            clone.style.margin = "0 auto";

            const slot = document.getElementById("slot" + selected.length);
            if (slot) {
                slot.innerHTML = "";
                slot.appendChild(clone);
            }

            selected.push(index);
            card.classList.add("locked");
        });
    });

<<<<<<< HEAD
    // 點解牌 → 跳轉
=======
    const interpretBtn = document.getElementById("interpretBtn");
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
    if (interpretBtn) {
        interpretBtn.addEventListener("click", () => {
            if (selected.length < maxSelect) {
                showAlert(`請先選滿 ${maxSelect} 張牌再解牌！`);
                return;
            }
<<<<<<< HEAD

            window.location.href = `/interpret?category_id=${category_id}&count=${maxSelect}`;
=======
            showAlert(`解牌觸發！已選牌序號：${selected.join(", ")}`);
>>>>>>> cbe040e1e5fe1c94924d944b8d1148727ad47eb0
        });
    }
});
