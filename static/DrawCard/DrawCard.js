// /static/DrawCard/DrawCard.js
console.log("🟢 DrawCard JS loaded.");

function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");
    if (!modal || !msgBox || !btn) return;
    msgBox.textContent = msg;
    modal.style.display = "flex";
    btn.onclick = () => { modal.style.display = "none"; };
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 Tarot JS running...");

    // 嘗試找到主要區塊與 spread
    const drawContainer = document.querySelector('.draw-container') || document.body;
    const spread = document.querySelector('.spread') || null;

    // 建或取 button-container（如果不存在就建立一個並放到 spread 後或 drawContainer 內）
    let buttonContainer = document.querySelector('.button-container');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        if (spread && spread.parentNode) {
            // 插入到 spread 之後
            spread.parentNode.insertBefore(buttonContainer, spread.nextSibling);
        } else if (drawContainer) {
            drawContainer.appendChild(buttonContainer);
        } else {
            document.body.appendChild(buttonContainer);
        }
    }

    // 取得或建立回主頁按鈕
    let homeBtn = document.getElementById('homeBtn');
    if (!homeBtn) {
        homeBtn = document.createElement('button');
        homeBtn.id = 'homeBtn';
        homeBtn.className = 'interpret-button';
        homeBtn.textContent = '🏠 回主頁';
        buttonContainer.appendChild(homeBtn);
    }

    // 找出頁面上所有可能的「解牌」按鈕（包含文字含「解牌」的）
    const candidateInterpretButtons = Array.from(document.querySelectorAll('button'))
        .filter(b => {
            if (!b.textContent) return false;
            // 移除空白後包含「解牌」
            return b.textContent.replace(/\s/g, '').indexOf('解牌') !== -1;
        });

    // 選一個要保留的 interpretBtn（優先找有 id 的）
    let interpretBtn = document.getElementById('interpretBtn') || candidateInterpretButtons[0] || null;

    // 若都找不到，就建立一個（通常不會需要，但保險起見）
    if (!interpretBtn) {
        interpretBtn = document.createElement('button');
        interpretBtn.id = 'interpretBtn';
        interpretBtn.className = 'interpret-button';
        interpretBtn.textContent = '🔮 解牌';
        buttonContainer.prepend(interpretBtn);
    } else {
        // 刪除多餘的「解牌」按鈕，只保留 interpretBtn
        candidateInterpretButtons.forEach(btn => {
            if (btn !== interpretBtn) {
                if (btn.parentNode) btn.parentNode.removeChild(btn);
            }
        });
        // 將 interpretBtn 移入 buttonContainer（如果尚未在裡面）
        if (interpretBtn.parentNode !== buttonContainer) {
            buttonContainer.prepend(interpretBtn);
        }
        // 加上樣式 class（保險）
        interpretBtn.classList.add('interpret-button');
        interpretBtn.id = interpretBtn.id || 'interpretBtn';
    }

    // 設定 homeBtn 事件（如果尚未綁）
    if (homeBtn) {
        homeBtn.onclick = null;
        homeBtn.addEventListener('click', () => { window.location.href = '/'; });
    }

    // 準備卡牌選取邏輯
    const maxSelect = parseInt(spread?.dataset.count) || 4;
    let selected = [];
    const cards = Array.from(document.querySelectorAll('.card'));

    // 先移除舊的 event（避免重複綁定）——透過 clone 技巧重新綁
    cards.forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
    });

    // 重新取得 cards
    const freshCards = Array.from(document.querySelectorAll('.card'));

    freshCards.forEach(card => {
        card.addEventListener('click', () => {
            const index = card.dataset.index;
            if (!index && index !== 0 && index !== '0') {
                // 若沒有 index 屬性，嘗試用 dataset.indexString 或其它（不強制）
            }
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

    // 設定解牌按鈕功能（先移除原本 onclick，然後綁新的）
    if (interpretBtn) {
        interpretBtn.onclick = null;
        interpretBtn.addEventListener('click', () => {
            if (selected.length < maxSelect) {
                showAlert(`請先選滿 ${maxSelect} 張牌再解牌！`);
                return;
            }
            const urlParams = new URLSearchParams(window.location.search);
            const category_id = urlParams.get("category_id") || "";
            window.location.href = `/interpret?category_id=${category_id}&count=${maxSelect}`;
        });
    }

    // debug log：顯示目前按鈕情況
    console.log('buttonContainer:', buttonContainer);
    console.log('interpretBtn:', interpretBtn);
    console.log('homeBtn:', homeBtn);
});
