

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
    // console.log("Retrieved from sessionStorage:", { count, categoryId, subquestionText });

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
        // console.log("🔍 API Response:", data);

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
        // If you have an element with class 'modal-body', set its overflow
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.style.overflow = 'hidden';
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

// GPT 生成總結 + Spotify 音樂推薦
let summaryLoaded = false;      // summary 是否生成過
let musicLoaded = false;        // 音樂是否生成過
let musicDataCache = null;      // 儲存第一次生成的音樂推薦

async function generateSummary(cards, summaryText) {
    const categoryId = sessionStorage.getItem("category_id");
    const subquestionText = sessionStorage.getItem("subquestion_text");

    // 顯示 loading
    summaryText.innerHTML = `<p class="show">🔮 正在生成占卜總結...</p>`;

    let summary = "";

    // 1️⃣ GPT 占卜總結
    if (!summaryLoaded) {
        try {
            const res = await fetch("/api/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category_id: categoryId, subquestion_text: subquestionText, cards })
            });
            const data = await res.json();

            if (data.status === "ok") {
                summary = data.summary;
                summaryText.innerHTML = summary;

                // 漸入動畫
                const paragraphs = summaryText.querySelectorAll("p");
                paragraphs.forEach((p, i) => {
                    setTimeout(() => p.classList.add("show"), i * 1000);
                });
                setTimeout(() => {
                    const musicContainer = document.getElementById("musicRecommend");
                    if (musicContainer) {
                        musicContainer.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                }, paragraphs.length * 1000 + 500); // 確保在最後一段後滾動
                summaryLoaded = true;
            } else {
                summaryText.textContent = "生成失敗：" + (data.msg || "未知錯誤");
                return;
            }
        } catch (err) {
            console.error("GPT summary 錯誤：", err);
            summaryText.textContent = "⚠️ 生成總結時發生錯誤，請稍後再試。";
            return;
        }
    } else {
        summary = summaryText.innerText; // 已生成過 summary
    }

    // 2️⃣ 音樂推薦
    const musicContainer = document.getElementById("musicRecommend");
    if (!musicLoaded) {
        musicContainer.innerHTML = `<p>🎵 正在為你尋找與牌意相符的音樂...</p>`;

        try {
            const musicRes = await fetch("/api/recommend_music", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ summary, subquestion_text: subquestionText })
            });

            const musicData = await musicRes.json();
            musicDataCache = musicData; // 儲存第一次結果
            // console.log("🎵 Music Recommendation Response:", musicData);
            if (musicData.status === "ok" && musicData.music.length > 0) {
                renderMusicRecommendation(musicData, musicContainer);
                setTimeout(() => {
                    musicContainer.scrollIntoView({ behavior: "smooth", block: "end" });
                }, 300); // 小延遲確保內容渲染完成
            } else {
                musicContainer.innerHTML = `<p>未能找到合適的音樂推薦。</p>`;
            }
            musicLoaded = true;
        } catch (err) {
            console.error("音樂推薦錯誤：", err);
            musicContainer.innerHTML = `<p>⚠️ 無法取得音樂推薦，請稍後再試。</p>`;
        }
    } else if (musicDataCache) {
        // 已生成過，直接使用 cache
        renderMusicRecommendation(musicDataCache, musicContainer);
    }
}

// 渲染音樂推薦內容
function renderMusicRecommendation(musicData, container) {
    // console.log("Rendering music recommendation:", musicData);

    // 清空容器
    container.innerHTML = "";

    // 顯示主題
    const title = document.createElement("h3");
    title.style.color = "#fff";
    title.textContent = `🎧 推薦主題：${musicData.theme}`;
    container.appendChild(title);

    // 歌曲列表
    const listDiv = document.createElement("div");
    listDiv.style.marginTop = "10px";
    listDiv.style.textAlign = "center";

    musicData.music.forEach((m) => {
        const songDiv = document.createElement("div");
        songDiv.style.marginBottom = "20px"; // 每首歌間距

        songDiv.innerHTML = `
            <p><strong>${m.name}</strong><br><span style="color:#aaa;">${m.artist}</span></p>
            <p style="font-style:italic; color:#ccc;">🎵 歌詞重點：${m.lyrics_hint}</p>
            <iframe style="border-radius:16px; border:none; box-shadow:0 8px 20px rgba(0,0,0,0.3);"
                src="${m.embed_url}" 
                width="350" height="80" 
                allowtransparency="true" 
                allow="encrypted-media">
            </iframe>
        `;

        listDiv.appendChild(songDiv);
    });

    container.appendChild(listDiv);
}
