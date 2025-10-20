console.log("🟢 DrawCard JS loaded.");

const cardBackUrl = "/static/images/card_back.png";

// 自訂警示框
function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");
    if (!modal || !msgBox || !btn) { alert(msg); return; }
    msgBox.textContent = msg;
    modal.style.display = "flex";
    btn.onclick = () => { modal.style.display = "none"; };
}

// 生成塔羅牌 HTML 
function generate_tarot_html(slotTitles) {
    const totalCards = 78;
    const cardWidth = 100;
    const containerWidth = 1200;
    const radius = 600;
    const centerX = containerWidth / 2;
    const centerY = 580; 
    const angleStart = -40;
    const angleEnd = 40; 
    const angleStep = (angleEnd - angleStart) / (totalCards - 1);
    let html = "<div class='wrapper'><div class='fan-container'>";
    for (let i = 0; i < totalCards; i++) {
        const angleDeg = angleStart + i * angleStep;
        const angleRad = angleDeg * Math.PI / 180;
        const x = centerX + radius * Math.sin(angleRad) - cardWidth / 2;
        const y = centerY - radius * Math.cos(angleRad);
        html += `<img src='${cardBackUrl}' class='card' data-index='${i}' style='transform: rotate(${angleDeg}deg); z-index:${i}; left:${x}px; top:${y}px;' />`;
    } 
    html += "</div></div>";

    // slot 區域 
    html += `<div class='spread' data-count='${slotTitles.length}'>`; 
    if (slotTitles.length === 4) {
        html += `<div class='slot slot-top' id='slot0'>${slotTitles[0]}</div>`;
        html += "<div class='slot-row'>";
        slotTitles.slice(1).forEach((title, i) => {
            html += `<div class='slot' id='slot${i + 1}'>${title}</div>`;
        });
        html += "</div>";
    } else {
        html += "<div class='slot-row'>";
        slotTitles.forEach((title, i) => {
            html += `<div class='slot' id='slot${i}'>${title}</div>`;
        });
        html += "</div>";
    }
    html += "</div>";
    return html;
}

// 初始化函式
function initTarotPage() {
    console.log("🟢 Tarot JS running...");

    const count = parseInt(sessionStorage.getItem("count"), 10) || 4;
    const categoryId = sessionStorage.getItem("category_id");
    const categoryName = sessionStorage.getItem("category_name");
    const subquestionText = sessionStorage.getItem("subquestion_text");
    console.log("Retrieved from sessionStorage - count:", count, "categoryId:", categoryId, "categoryName:", categoryName, "subquestionText:", subquestionText);

    if (!categoryId || !subquestionText) {
        showAlert("缺少必要資料，請重新選擇問題類型！");
        setTimeout(() => { window.location.href = "/select"; }, 1500);
        return;
    }

    const slotTitles = count === 3
        ? ["過去", "現在", "未來"]
        : ["問題核心", "障礙或短處", "對策", "資源或長處"];

    const tarotContainer = document.getElementById("tarotContainer") || document.body;
    tarotContainer.innerHTML = generate_tarot_html(slotTitles);

    // 按鈕容器
    let buttonContainer = document.querySelector('.button-row');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-row';
        tarotContainer.appendChild(buttonContainer);
    }

    // 解牌按鈕
    let interpretBtn = document.getElementById('interpretBtn');
    if (!interpretBtn) {
        interpretBtn = document.createElement('button');
        interpretBtn.id = 'interpretBtn';
        interpretBtn.className = 'interpret-button';
        interpretBtn.textContent = '🔮 解牌';
        buttonContainer.appendChild(interpretBtn);
    }

    // 回上一頁按鈕
    let homeBtn = document.getElementById('homeBtn');
    if (!homeBtn) {
        homeBtn = document.createElement('button');
        homeBtn.id = 'homeBtn';
        homeBtn.className = 'interpret-button';
        homeBtn.textContent = '回上一頁';
        buttonContainer.appendChild(homeBtn);
    }

    homeBtn.onclick = () => { 
        sessionStorage.removeItem("selected_cards"); 
        window.history.back(); 
    };

    // 卡牌選取
    const maxSelect = count;
    let selected = [];
    window.selected = selected;

    const cards = Array.from(document.querySelectorAll('.card'));
    cards.forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
    });

    const freshCards = Array.from(document.querySelectorAll('.card'));
    freshCards.forEach(card => {
        card.addEventListener('click', () => {
            const index = card.dataset.index;
            if (selected.includes(index)) return;

            if (selected.length >= maxSelect) {
                showAlert(`已經選滿 ${maxSelect} 張牌，可以開始解牌！`);
                return;
            }

            const clone = card.cloneNode(true);
            clone.removeAttribute("style");
            clone.style.position = "relative";
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

    // 解牌按鈕事件
    interpretBtn.onclick = () => {
        if (selected.length < maxSelect) {
            showAlert(`請先選滿 ${maxSelect} 張牌再解牌！`);
            return;
        }

        sessionStorage.setItem("selected_cards", JSON.stringify(selected));
        sessionStorage.setItem("count", maxSelect);
        sessionStorage.setItem("category_id", categoryId);
        sessionStorage.setItem("subquestion_text", subquestionText);

        window.location.href = `/interpret`;
    };

    // ✅ 確保 slot title 即使第一次載入也正確
    document.querySelectorAll(".slot").forEach((slot, i) => {
        if (!slot.textContent.trim()) slot.textContent = slotTitles[i] || "";
    });

    console.log("slotTitles:", slotTitles);
    console.log("maxSelect:", maxSelect, "categoryId:", categoryId);
}

// DOMContentLoaded 初始化
document.addEventListener("DOMContentLoaded", initTarotPage);

// pageshow 事件（從 bfcache 回來時觸發）
window.addEventListener("pageshow", (event) => {
    console.log("🟢 PageShow triggered");

    const count = parseInt(sessionStorage.getItem("count"), 10) || 4;
    const slotTitles = count === 3
        ? ["過去", "現在", "未來"]
        : ["問題核心", "障礙或短處", "對策", "資源或長處"];

    document.querySelectorAll(".slot").forEach((slot, i) => {
        // 移除 slot 中的圖片
        slot.querySelectorAll("img").forEach(img => img.remove());
        // ✅ 重新填回 slot title
        slot.textContent = slotTitles[i] || "";
    });

    // 移除所有被鎖定的卡牌
    document.querySelectorAll(".card.locked").forEach(card => card.classList.remove("locked"));

    // 清空已選牌記錄
    if (window.selected) window.selected.length = 0;

    console.log("🔁 Slots restored, selections cleared.");
});
