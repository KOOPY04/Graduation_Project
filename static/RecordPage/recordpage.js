async function fetchRecords() {
    const userId = sessionStorage.getItem("user_id");
    if (!userId) {
        console.error("找不到使用者 ID，請先登入");
        return;
    }
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/tarot-records/${userId}`);
        const records = await res.json();
        if (!Array.isArray(records)) {
            console.error("抓取塔羅紀錄失敗:", records);
            return;
        }
        console.log("📦 抓取塔羅紀錄成功:", records);

        // records.forEach(record => {
        //     console.log(record.music)

        // });
        displayRecords(records);
    } catch (err) {
        console.error("抓取塔羅紀錄失敗:", err);
    }
}

function displayRecords(records) {
    const container = document.getElementById("records");
    container.innerHTML = "";

    // header row
    const headerDiv = document.createElement("div");
    headerDiv.style.display = "grid";
    headerDiv.style.gridTemplateColumns = "150px 150px 150px 1fr 120px";
    headerDiv.style.fontWeight = "bold";
    headerDiv.style.backgroundColor = "#f0f0f0";
    headerDiv.style.alignItems = "center";
    headerDiv.style.padding = "12px";
    headerDiv.style.textAlign = "center";
    headerDiv.style.borderRadius = "8px";
    headerDiv.style.marginBottom = "12px";
    headerDiv.style.gap = "6px";
    ["時間", "問題類型", "子問題", "抽牌", "總結"].forEach(h => {
        const div = document.createElement("div");
        div.textContent = h;
        div.style.color = "#333";
        headerDiv.appendChild(div);
    });
    container.appendChild(headerDiv);

    // 每筆紀錄
    records.forEach(record => {
        const recDiv = document.createElement("div");
        recDiv.className = "record";
        recDiv.style.display = "grid";
        recDiv.style.gridTemplateColumns = "150px 150px 150px 1fr 120px";
        recDiv.style.alignItems = "center";
        recDiv.style.border = "1px solid #ddd";
        recDiv.style.padding = "12px";
        recDiv.style.marginBottom = "16px";
        recDiv.style.borderRadius = "12px";
        recDiv.style.boxShadow = "0 1px 6px rgba(0,0,0,0.08)";
        recDiv.style.backgroundColor = "#fff";
        recDiv.style.gap = "6px";

        // 資料欄位
        const dateDiv = document.createElement("div");
        dateDiv.textContent = new Date(record.created_at).toLocaleString();
        dateDiv.style.fontSize = "0.85em";
        dateDiv.style.color = "#666";
        dateDiv.style.textAlign = "center";

        const qDiv = document.createElement("div");
        qDiv.textContent = record.question_type || record.category;
        qDiv.style.fontWeight = "bold";
        qDiv.style.textAlign = "center";

        const subDiv = document.createElement("div");
        subDiv.textContent = record.subquestion || "";
        subDiv.style.fontStyle = "italic";
        subDiv.style.color = "#333";
        subDiv.style.textAlign = "center";

        // 卡牌列
        const cardsDiv = document.createElement("div");
        cardsDiv.style.display = "flex";
        cardsDiv.style.flexWrap = "wrap";
        cardsDiv.style.justifyContent = "center";
        cardsDiv.style.alignItems = "center";
        cardsDiv.style.gap = "6px";

        record.selected_cards.forEach(card => {
            const cardDiv = document.createElement("div");
            cardDiv.style.width = "70px";
            cardDiv.style.cursor = "pointer";

            const img = document.createElement("img");
            img.src = getCardImagePath(card.name);
            img.style.width = "100%";
            img.style.borderRadius = "6px";
            img.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
            img.style.transform = card.orientation === "逆位" ? "rotate(180deg)" : "rotate(0deg)";
            cardDiv.appendChild(img);

            cardsDiv.appendChild(cardDiv);
        });

        // 總結按鈕
        const sumDiv = document.createElement("div");
        sumDiv.style.display = "flex";
        sumDiv.style.justifyContent = "center";
        sumDiv.style.alignItems = "center";

        // 總結按鈕
        if (record.summary || (record.music && record.music.music && record.music.music.length)) {
            const summaryBtn = document.createElement("button");
            summaryBtn.textContent = "查看總結";
            summaryBtn.className = "summary-btn"; // 可加 CSS
            sumDiv.appendChild(summaryBtn);

            // modal
            const modal = document.createElement("div");
            modal.className = "modal";

            const modalContent = document.createElement("div");
            modalContent.className = "modal-content";

            const title = document.createElement("h2");
            title.textContent = "塔羅總結與音樂推薦";
            modalContent.appendChild(title);

            const closeBtn = document.createElement("span");
            closeBtn.className = "close-btn";
            closeBtn.innerHTML = "&times;";

            const scrollWrapper = document.createElement("div");
            scrollWrapper.className = "modal-scroll-wrapper";

            // summary text
            const summaryText = document.createElement("div");
            summaryText.id = "summaryText";
            summaryText.className = "modal-body";
            summaryText.innerHTML = record.summary || "<p>無總結內容</p>";
            scrollWrapper.appendChild(summaryText);

            // 音樂推薦
            const musicContainer = document.createElement("div");
            musicContainer.id = "musicRecommend";
            musicContainer.className = "music-recommend";
            scrollWrapper.appendChild(musicContainer);

            modalContent.appendChild(closeBtn);
            modalContent.appendChild(scrollWrapper);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Render music
            if (record.music) {
                const musicData = typeof record.music === "string" ? JSON.parse(record.music) : record.music;
                if (musicData && musicData.music && musicData.music.length > 0) {
                    renderMusicRecommendation(musicData, musicContainer);
                } else {
                    musicContainer.innerHTML = "<p>未找到音樂推薦。</p>";
                }
            }

            // events
            summaryBtn.addEventListener("click", () => {
                modal.style.display = "flex";
                document.body.style.overflow = "hidden";
            });
            closeBtn.addEventListener("click", () => {
                modal.style.display = "none";
                document.body.style.overflow = "auto";
            });
            modal.addEventListener("click", e => {
                if (e.target === modal) {
                    modal.style.display = "none";
                    document.body.style.overflow = "auto";
                }
            });
        }

        // append
        recDiv.appendChild(dateDiv);
        recDiv.appendChild(qDiv);
        recDiv.appendChild(subDiv);
        recDiv.appendChild(cardsDiv);
        recDiv.appendChild(sumDiv);

        container.appendChild(recDiv);
    });

    console.log("✅ 塔羅紀錄顯示完成");
}

function renderMusicRecommendation(musicData, container) {
    container.innerHTML = "";
    const title = document.createElement("h3");
    title.style.color = "#fff";
    title.textContent = `🎧 推薦主題：${musicData.theme || ''}`;
    container.appendChild(title);

    const listDiv = document.createElement("div");
    listDiv.style.marginTop = "10px";
    listDiv.style.textAlign = "center";

    musicData.music.forEach((m) => {
        const songDiv = document.createElement("div");
        songDiv.style.marginBottom = "20px";
        songDiv.innerHTML = `
            <p><strong>${m.name}</strong><br><span style="color:#aaa;">${m.artist}</span></p>
            <p style="font-style:italic; color:#ccc;">🎵 歌詞重點：${m.lyrics_hint || ''}</p>
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


function getCardImagePath(name) {
    const major = ["愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者", "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽", "審判", "世界"];
    let folder = major.includes(name) ? "大阿爾克" :
        name.includes("聖杯") ? "聖杯" :
            name.includes("錢幣") ? "錢幣" :
                name.includes("寶劍") ? "寶劍" :
                    name.includes("權杖") ? "權杖" : "其他";
    return `/static/images/${folder}/${name}.png`;
}

fetchRecords();
