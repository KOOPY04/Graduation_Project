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

// GPT + Spotify 狀態
let summaryLoaded = false;
let musicLoaded = false;
let musicDataCache = null;

// DOM 載入
document.addEventListener("DOMContentLoaded", async () => {
    const spreadContainer = document.getElementById("spreadContainer");
    const count = parseInt(sessionStorage.getItem("count"), 10) || 3;
    const categoryId = sessionStorage.getItem("category_id");
    const subquestionText = sessionStorage.getItem("subquestion_text");

    if (!categoryId || !subquestionText) {
        showAlert("缺少問題資料，請回主頁重新選擇！");
        window.location.href = "/";
        return;
    }

    spreadContainer.dataset.count = count;

    // 嘗試從 sessionStorage 載入快取
    const savedCards = sessionStorage.getItem("saved_cards");
    const savedSummary = sessionStorage.getItem("saved_summary");
    const savedMusic = sessionStorage.getItem("saved_music");

    if (savedCards) {
        console.log("📦 從 sessionStorage 載入上次結果");
        const cards = JSON.parse(savedCards);
        renderCards(spreadContainer, cards, count);
        setupSummaryButton(cards);

        // ✅ 載入文字總結
        if (savedSummary) {
        try {
            const summaryText = document.getElementById("summaryText");
            const summaryData = JSON.parse(savedSummary);
         if (summaryData && summaryData.html) {
                summaryText.innerHTML = summaryData.html;
                // 直接加上 .show 讓文字顯示
                const paragraphs = summaryText.querySelectorAll("p");
                paragraphs.forEach(p => p.classList.add("show"));
         } else if (typeof summaryData === "string") {
            summaryText.innerHTML = summaryData;
        }
            summaryLoaded = true;
            console.log("📦 從 sessionStorage 載入 summary 成功");
         } catch (e) {
            console.error("載入 saved_summary 錯誤：", e);
            sessionStorage.removeItem("saved_summary");
        }
    }

        // ✅ 載入音樂推薦
        if (savedMusic) {
            try {
                const musicData = JSON.parse(savedMusic);
                const musicContainer = document.getElementById("musicRecommend");
                renderMusicRecommendation(musicData, musicContainer);
                musicLoaded = true;
                musicDataCache = musicData;
            } catch (e) {
                console.error("載入 saved_music 錯誤：", e);
                sessionStorage.removeItem("saved_music");
            }
        }

        return; // 已有快取資料，不重跑 interpret API
    }

    // 🧩 沒有快取 → 呼叫 /api/interpret
    try {
        const res = await fetch("/api/interpret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId, subquestion_text: subquestionText, count })
        });

        const data = await res.json();

        if (data.status !== "ok" || !data.cards || data.cards.length === 0) {
            showAlert(data.msg || "取得牌義失敗！");
            return;
        }

        // ✅ 儲存抽牌結果
        sessionStorage.setItem("saved_cards", JSON.stringify(data.cards));

        // 渲染牌面
        renderCards(spreadContainer, data.cards, count);
        setupSummaryButton(data.cards);

    } catch (err) {
        console.error(err);
        showAlert("發生錯誤，請稍後再試！");
    }
});

// 渲染卡牌
function renderCards(container, cards, count) {
    container.innerHTML = "";

    if (count === 3) {
        cards.forEach(card => container.appendChild(createCardDiv(card)));
    } else if (count === 4) {
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

        const bottomRow = document.createElement("div");
        bottomRow.classList.add("bottom-row");
        for (let i = 1; i < cards.length; i++)
            bottomRow.appendChild(createCardDiv(cards[i]));
        container.appendChild(bottomRow);
    }
}

// 單張卡牌
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

// 按鈕與總結邏輯
function setupSummaryButton(cards) {
    const toggleBtn = document.getElementById("toggleSummaryBtn");
    const modal = document.getElementById("summaryModal");
    const closeBtn = document.getElementById("closeSummaryBtn");
    const summaryText = document.getElementById("summaryText");

    toggleBtn.onclick = async () => {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.style.overflow = 'hidden';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (!summaryLoaded) {
            await generateSummary(cards, summaryText);
            summaryLoaded = true;
        }
    };

    closeBtn.onclick = () => { modal.style.display = "none"; };
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
        document.body.style.overflow = 'auto';
    };
}

// GPT + Spotify
async function generateSummary(cards, summaryText) {
    const categoryId = sessionStorage.getItem("category_id");
    const subquestionText = sessionStorage.getItem("subquestion_text");

    summaryText.innerHTML = `<p class="show">🔮 正在生成占卜總結...</p>`;
    let summary = "";

    // GPT Summary
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

            // ✅ 儲存 summary（包成 JSON 結構）
            sessionStorage.setItem("saved_summary", JSON.stringify({ html: summary }));

            const paragraphs = summaryText.querySelectorAll("p");
            paragraphs.forEach((p, i) => setTimeout(() => p.classList.add("show"), i * 1000));
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

    // 🎵 音樂推薦
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
            if (musicData.status === "ok" && musicData.music.length > 0) {
                renderMusicRecommendation(musicData, musicContainer);
                sessionStorage.setItem("saved_music", JSON.stringify(musicData));
            } else {
                musicContainer.innerHTML = `<p>未能找到合適的音樂推薦。</p>`;
            }
            musicLoaded = true;
            musicDataCache = musicData;
        } catch (err) {
            console.error("音樂推薦錯誤：", err);
            musicContainer.innerHTML = `<p>⚠️ 無法取得音樂推薦，請稍後再試。</p>`;
        }
    } else if (musicDataCache) {
        renderMusicRecommendation(musicDataCache, musicContainer);
    }
}

function renderMusicRecommendation(musicData, container) {
    container.innerHTML = "";
    const title = document.createElement("h3");
    title.style.color = "#fff";
    title.textContent = `🎧 推薦主題：${musicData.theme}`;
    container.appendChild(title);

    const listDiv = document.createElement("div");
    listDiv.style.marginTop = "10px";
    listDiv.style.textAlign = "center";

    musicData.music.forEach((m) => {
        const songDiv = document.createElement("div");
        songDiv.style.marginBottom = "20px";
        songDiv.innerHTML = `
            <p><strong>${m.name}</strong><br><span style="color:#aaa;">${m.artist}</span></p>
            <p style="font-style:italic; color:#ccc;">🎵 歌詞重點：${m.lyrics_hint}</p>
            <iframe style="border-radius:16px; border:none; box-shadow:0 8px 20px rgba(0,0,0,0.3);"
                src="${m.embed_url}" 
                width="350" height="80" 
                allowtransparency="true" 
                allow="encrypted-media">
            </iframe>`;
        listDiv.appendChild(songDiv);
    });
    container.appendChild(listDiv);
}
