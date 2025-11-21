async function fetchRecords() {
    const userId = sessionStorage.getItem("user_id");
    if (!userId) return console.error("找不到使用者 ID");

    try {
        const res = await fetch(`https://tarot-arcana.up.railway.app/api/tarot-records/${userId}`);
        const records = await res.json();
        if (!Array.isArray(records)) return console.error("抓取塔羅紀錄失敗:", records);

        displayRecords(records);
    } catch (err) {
        console.error("抓取塔羅紀錄失敗:", err);
    }
}

function displayRecords(records) {
    const container = document.getElementById("records");
    container.innerHTML = "";

    if (!records || records.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "no-records";
        emptyDiv.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #f9f2ff, #e6e0ff);
                border: 2px solid #b19cd9;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                font-family: 'cwTeXFangSong', sans-serif;
                color: #4b0082;
                max-width: 400px;
                margin: 50px auto;
                justify-content: center; /* 水平置中 */
                align-items: center;     /* 垂直置中 */
            ">
                <p style="font-size: clamp(16px, 4vw, 20px); margin-bottom: 15px;">
                    🌟 你還沒有任何塔羅占卜紀錄喔～
                </p>
                <p style="font-size: clamp(16px, 4vw, 20px); margin-bottom: 25px;">
                    🔮 快去抽一張牌，探索你的未來吧！
                </p>
                <a href="/select" class="btn">開始占卜</a>
            </div>
        `;
        container.appendChild(emptyDiv);
        return;
    }

    records.forEach(record => {
        const recDiv = document.createElement("div");
        recDiv.className = "record";

        const dateDiv = document.createElement("div");
        dateDiv.textContent = new Date(record.created_at).toLocaleString();

        const qDiv = document.createElement("div");
        qDiv.textContent = record.question_type || record.category;

        const subDiv = document.createElement("div");
        subDiv.textContent = record.subquestion || "";

        const cardsDiv = document.createElement("div");
        cardsDiv.style.display = "flex";
        cardsDiv.style.flexWrap = "wrap";
        cardsDiv.style.justifyContent = "center";
        cardsDiv.style.alignItems = "center";
        cardsDiv.style.gap = "6px";

        record.selected_cards.forEach(card => {
            const cardDiv = document.createElement("div");
            cardDiv.className = "card-container";
            cardDiv.style.position = "relative"; // 仍保留相對定位作為參考

            const img = document.createElement("img");
            img.src = getCardImagePath(card.name);
            img.style.transform = card.orientation === "逆位" ? "rotate(180deg)" : "rotate(0deg)";
            cardDiv.appendChild(img);

            // tooltip：顯示卡牌名稱 + 正逆位
            const tooltip = document.createElement("div");
            tooltip.className = "tooltip";
            tooltip.style.position = "fixed"; // 改成 fixed
            tooltip.style.display = "none";
            tooltip.innerText = `${card.name} (${card.orientation})`;
            document.body.appendChild(tooltip); // 放到 body

            // 事件：計算 fixed 位置
            cardDiv.addEventListener("mouseenter", () => {
                const rect = cardDiv.getBoundingClientRect();
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 20}px`; // 卡牌上方 20px
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                tooltip.style.display = "block";
            });
            cardDiv.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
            });

            cardsDiv.appendChild(cardDiv);
        });



        const sumDiv = document.createElement("div");
        if (record.summary || (record.music && record.music.music && record.music.music.length)) {
            const summaryBtn = document.createElement("button");
            summaryBtn.textContent = "查看總結";
            summaryBtn.className = "summary-btn";
            sumDiv.appendChild(summaryBtn);

            const modal = document.createElement("div");
            modal.className = "modal";

            const modalContent = document.createElement("div");
            modalContent.className = "modal-content";

            const scrollWrapper = document.createElement("div");
            scrollWrapper.className = "modal-scroll-wrapper";

            const modalBody = document.createElement("div");
            modalBody.className = "modal-body";

            const closeBtn = document.createElement("span");
            closeBtn.className = "close-btn";
            closeBtn.innerHTML = "&times;";

            const title = document.createElement("h2");
            title.textContent = "塔羅總結與音樂推薦";


            const summaryText = document.createElement("div");
            summaryText.innerHTML = record.summary || "<p>無總結內容</p>";
            modalBody.appendChild(summaryText);
            scrollWrapper.appendChild(modalBody);

            const musicRecommend = document.createElement("div");
            musicRecommend.className = "music-recommend";
            const musicTitle = document.createElement("h3");
            musicTitle.textContent = "🎶 音樂推薦";
            musicRecommend.appendChild(musicTitle);
            scrollWrapper.appendChild(musicRecommend);

            modalContent.append(title, closeBtn, scrollWrapper);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            if (record.music) renderMusicRecommendation(record.music, musicRecommend);

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

        recDiv.append(dateDiv, qDiv, subDiv, cardsDiv, sumDiv);
        container.appendChild(recDiv);
    });
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

        const nameSpan = document.createElement("p");
        nameSpan.innerHTML = `<strong style="font-size: clamp(16px, 3vw, 25px); color: #151515;">${m.name}</strong><br><span style="color:#e6e2e2; font-size: clamp(16px, 3vw, 25px);">${m.artist}</span>`;
        songDiv.appendChild(nameSpan);

        const lyricsSpan = document.createElement("p");
        lyricsSpan.style.cssText = "font-style:italic; color:#ccc;";
        lyricsSpan.textContent = `🎵 歌詞重點：${m.lyrics_hint}`;
        songDiv.appendChild(lyricsSpan);

        // 響應式 Spotify iframe
        const wrapper = document.createElement("div");
        wrapper.classList.add("spotify-wrapper");
        const iframe = document.createElement("iframe");
        iframe.src = m.embed_url;
        iframe.allow = "encrypted-media";
        iframe.allowTransparency = true;
        wrapper.appendChild(iframe);

        songDiv.appendChild(wrapper);
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
    return `/static/images/${folder}/${name}.webp`;
}

fetchRecords();

