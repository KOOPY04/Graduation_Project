console.log("🟢 Tarot JS loaded.");
// 顯示自訂警示框
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

    const interpretBtn = document.getElementById("interpretBtn");
    if (interpretBtn) {
        interpretBtn.addEventListener("click", () => {
            if (selected.length < maxSelect) {
                showAlert(`請先選滿 ${maxSelect} 張牌再解牌！`);
                return;
            }
            showAlert(`解牌觸發！已選牌序號：${selected.join(", ")}`);
        });
    }
});
