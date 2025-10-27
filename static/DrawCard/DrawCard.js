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
    const totalCards = 39;
    let html = "<div class='wrapper'><div class='fan-container' id='fanContainer'>";
    for (let i = 0; i < totalCards; i++) {
        html += `<img src='${cardBackUrl}' class='card' data-index='${i}' />`;
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

    // 卡牌選取與環形排列
    const maxSelect = count;
    let selected = [];
    window.selected = selected;

    const fanContainer = document.getElementById("fanContainer");
    const cards = Array.from(fanContainer.querySelectorAll(".card"));
    let radius = 600;   // 半徑
    let cardScale = 0.9;
    let rotateY = 0;
    let isDragging = false;
    let lastX = 0;
    let velocity = 0;

    // 先移除已存在提示，避免重複
    const existingTip = document.getElementById("dragTip");
    if (existingTip) existingTip.remove();

    // 創建提示元素
    const tip = document.createElement("div");
    tip.id = "dragTip";
    tip.textContent = "←  拖曳 / 滑動左右旋轉牌陣  →";
    tip.style.textAlign = "center";
    tip.style.marginTop = "10px";
    tip.style.fontSize = "20px";
    tip.style.color = "#666";
    tip.style.fontWeight = "700";
    // 插入到牌陣容器下方
    fanContainer.parentNode.appendChild(tip);


    function positionCards() {
        const total = cards.length;
        cards.forEach((card, i) => {
            let angle = (i * 360 / total + rotateY) % 360;
            card.dataset.angle = angle;
            let tiltX = -15; // 俯視傾斜
            card.style.transform = `rotateY(${angle}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(${cardScale})`;
            let opacity = card.classList.contains("locked") ? 0.3 : 0.6;
            card.style.opacity = opacity;
            card.style.zIndex = 0;
        });
        highlightFront();
    }

    function highlightFront() {
        let minDiff = 360;
        let frontCard = null;
        const tiltX = -15;

        cards.forEach(card => {
            let angle = (parseFloat(card.dataset.angle)) % 360;
            if (angle < 0) angle += 360;
            let diff = Math.min(Math.abs(angle), Math.abs(360 - angle));
            if (diff < minDiff) {
                minDiff = diff;
                frontCard = card;
            }

            // 所有卡牌統一 z 軸位置
            card.style.transform = `rotateY(${parseFloat(card.dataset.angle)}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(${cardScale})`;
            let opacity = card.classList.contains("locked") ? 0.3 : 1;
            card.style.opacity = opacity;
            card.style.zIndex = 0;
        });

        // 突出顯示前方卡牌
        if (frontCard) {
            // frontCard.classList.add("front");
            let opacity = frontCard.classList.contains("locked") ? 0.3 : 1;
            frontCard.style.transform = `rotateY(${parseFloat(frontCard.dataset.angle)}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(1.2)`;
            frontCard.style.zIndex = 1000;
            frontCard.style.opacity = opacity;
        }
    }



    positionCards();
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const angle = parseFloat(card.dataset.angle) * Math.PI / 180;
            const offsetX = Math.sin(angle) * 30;   // 控制水平偏移
            const offsetZ = Math.cos(angle) * 30;   // 控制前後偏移
            card.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
            card.style.transform += ` translateX(${offsetX}px) translateZ(${offsetZ + 40}px) scale(1.35)`;
            card.style.boxShadow = "0 20px 40px rgba(0,0,0,0.5)";
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";
            const angle = parseFloat(card.dataset.angle);
            const tiltX = -15;
            card.style.transform = `rotateY(${angle}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(${cardScale})`;
            card.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.25)";
        });
    });

    // 滑鼠/手指拖動控制
    fanContainer.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; });
    fanContainer.addEventListener('touchstart', e => { isDragging = true; lastX = e.touches[0].clientX; });

    fanContainer.addEventListener('mousemove', e => {
        if (!isDragging) return;
        let delta = e.clientX - lastX;
        rotateY += delta * 0.5;
        lastX = e.clientX;
        velocity = delta * 0.5;
        positionCards();
    });
    fanContainer.addEventListener('touchmove', e => {
        if (!isDragging) return;
        let delta = e.touches[0].clientX - lastX;
        rotateY += delta * 0.5;
        lastX = e.touches[0].clientX;
        velocity = delta * 0.5;
        positionCards();
    });

    fanContainer.addEventListener('mouseup', e => { isDragging = false; });
    fanContainer.addEventListener('mouseleave', e => { isDragging = false; });
    fanContainer.addEventListener('touchend', e => { isDragging = false; });

    // 慣性動畫
    function inertia() {
        if (!isDragging) {
            velocity *= 0.95;
            rotateY += velocity;
            if (Math.abs(velocity) > 0.1) positionCards();
        }
        requestAnimationFrame(inertia);
    }
    inertia();

    // 點擊選牌
    cards.forEach(card => {
        card.addEventListener('click', () => {
            if (selected.length >= maxSelect) {
                showAlert(`已經選滿 ${maxSelect} 張牌，可以開始解牌！`);
                return;
            }
            if (selected.includes(card.dataset.index)) return;

            const clone = card.cloneNode(true);
            clone.style.transform = "none";
            clone.style.position = "relative";
            clone.style.margin = "0 auto";

            const slot = document.getElementById("slot" + selected.length);
            if (slot) {
                slot.innerHTML = "";
                slot.appendChild(clone);
            }

            selected.push(card.dataset.index);
            card.classList.add("locked");

            // **新增：選過的卡牌變透明**
            card.style.transition = "opacity 0.3s ease";
            card.style.opacity = 0.3;

            // 更新 sessionStorage
            sessionStorage.setItem("selected_cards", JSON.stringify(selected));
            sessionStorage.setItem("count", maxSelect);
            sessionStorage.setItem("category_id", categoryId);
            sessionStorage.setItem("category_name", categoryName);
            sessionStorage.setItem("subquestion_text", subquestionText);
            sessionStorage.setItem("saved_category_name", categoryName);
            sessionStorage.setItem("saved_subquestion", subquestionText);
        });
    });

    // 解牌按鈕
    interpretBtn.onclick = () => {
        if (selected.length < maxSelect) {
            showAlert(`請先選滿 ${maxSelect} 張牌再解牌！`);
            return;
        }
        window.location.href = `/interpret`;
    };

    // 確保 slot title
    document.querySelectorAll(".slot").forEach((slot, i) => {
        if (!slot.textContent.trim()) slot.textContent = slotTitles[i] || "";
    });
}

// DOMContentLoaded 初始化
document.addEventListener("DOMContentLoaded", initTarotPage);
