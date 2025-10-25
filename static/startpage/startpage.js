// ================= DOMContentLoaded =================
document.addEventListener("DOMContentLoaded", async () => {

    // ===== 清除上一輪占卜資料 =====
    sessionStorage.removeItem("saved_cards");
    sessionStorage.removeItem("saved_summary");
    sessionStorage.removeItem("saved_music");

    const cardBack = document.getElementById("cardBack");
    const cardNameModal = document.getElementById("cardNameModal");
    const closeCardName = document.getElementById("closeCardName");

    const introBtn = document.getElementById("introBtn");
    const introModal = document.getElementById("introModal");
    const closeIntro = document.getElementById("closeIntro");

    const modalOverlay = document.getElementById("modalOverlay");
    const modalCard = document.getElementById("modalCard");
    const modalCardName = document.getElementById("modalCardName");

    const tarotCards = [
        "權杖首牌", "權杖二", "權杖三", "權杖四", "權杖五", "權杖六", "權杖七", "權杖八", "權杖九", "權杖十",
        "權杖侍從", "權杖騎士", "權杖皇后", "權杖國王",
        "聖杯首牌", "聖杯二", "聖杯三", "聖杯四", "聖杯五", "聖杯六", "聖杯七", "聖杯八", "聖杯九", "聖杯十",
        "聖杯侍從", "聖杯騎士", "聖杯皇后", "聖杯國王",
        "寶劍首牌", "寶劍二", "寶劍三", "寶劍四", "寶劍五", "寶劍六", "寶劍七", "寶劍八", "寶劍九", "寶劍十",
        "寶劍侍從", "寶劍騎士", "寶劍皇后", "寶劍國王",
        "錢幣首牌", "錢幣二", "錢幣三", "錢幣四", "錢幣五", "錢幣六", "錢幣七", "錢幣八", "錢幣九", "錢幣十",
        "錢幣侍從", "錢幣騎士", "錢幣皇后", "錢幣國王",
        "愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者", "命運之輪",
        "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽", "審判", "世界"
    ];

    // ===== 取得塔羅牌圖片路徑 =====
    function getCardImagePath(name) {
        const major = ["愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者",
            "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽",
            "審判", "世界"];
        let folder = major.includes(name) ? "大阿爾克" :
            name.includes("聖杯") ? "聖杯" :
                name.includes("錢幣") ? "錢幣" :
                    name.includes("寶劍") ? "寶劍" :
                        name.includes("權杖") ? "權杖" : "其他";
        return `/static/images/${folder}/${name}.png`;
    }

    // ===== 預先載入所有塔羅牌圖片 =====
    async function preloadImages(srcArray) {
        const promises = srcArray.map(src => new Promise(resolve => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        }));
        await Promise.all(promises);
    }
    await preloadImages(tarotCards.map(getCardImagePath));

    document.body.style.overflow = 'hidden';

    // ===== 卡背滑鼠傾斜效果 =====
    cardBack.addEventListener("mousemove", (e) => {
        const rect = cardBack.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * 10;
        const rotateY = ((centerX - x) / centerX) * 10;
        cardBack.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        cardBack.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 25px rgba(0,0,0,0.5)`;
    });
    cardBack.addEventListener("mouseleave", () => {
        cardBack.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
        cardBack.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";
    });

    // ===== 點擊卡背生成散落牌 =====
    cardBack.addEventListener("click", () => {
        document.body.style.overflow = 'auto';
        cardBack.style.display = "none";

        const scatterContainer = document.createElement("div");
        scatterContainer.classList.add("tarot-scatter");
        document.querySelector(".scroll-container").appendChild(scatterContainer);

        const width = window.innerWidth;
        const height = window.innerHeight;

        // 分批生成卡牌（每批約 10 張）
        let index = 0;
        const batchSize = 10;
        const cardsElements = [];

        function spawnBatch() {
            const slice = tarotCards.slice(index, index + batchSize);
            slice.forEach((name,) => {
                const card = document.createElement("img");
                card.src = getCardImagePath(name);
                card.className = "card";
                card.dataset.name = name;
                card.style.position = "absolute";
                card.style.willChange = "transform";
                card.style.left = `${width / 2 - 60}px`;
                card.style.top = `${height / 2 - 90}px`;
                card.style.opacity = "0";
                card.style.transform = "scale(0.5) rotate(0deg)";
                card.style.transition = "transform 0.9s ease-out, opacity 0.9s ease-out";
                scatterContainer.appendChild(card);

                requestAnimationFrame(() => {
                    const x = Math.random() * (width - 120);
                    const y = Math.random() * (height - 160);
                    const rot = (Math.random() - 0.5) * 80;
                    const scale = 0.8 + Math.random() * 0.5;

                    card.style.left = `${x}px`;
                    card.style.top = `${y}px`;
                    card.style.opacity = "1";
                    card.style.transform = `translate3d(0,0,0) rotate(${rot}deg) scale(${scale})`;

                    cardsElements.push({ card, x, y, rot });
                });
            });
            index += batchSize;
            if (index < tarotCards.length) {
                setTimeout(spawnBatch, 120); // 每 0.12 秒產生一批，動畫更平滑
            }
        }
        spawnBatch();

        // ===== 點擊卡片放大檢視 =====
        scatterContainer.addEventListener("click", (e) => {
            if (e.target.tagName === "IMG") {
                const card = e.target;
                const name = card.dataset.name; // 直接取名
                modalCard.src = card.src;
                modalCardName.textContent = name; // 這樣就會正確顯示
                modalOverlay.classList.add("active");
                modalCard.classList.add("active");
                modalCardName.style.display = "block";
            }
        });


        // Modal 關閉邏輯
        modalOverlay.addEventListener("click", () => {
            modalOverlay.classList.remove("active");
            modalCard.classList.remove("active");
            modalCardName.style.display = "none";

            cardsElements.forEach(({ card, x, y, rot, z }) => {
                card.style.left = `${x}px`;
                card.style.top = `${y}px`;
                card.style.transform = `rotate(${rot}deg)`;
                card.style.zIndex = z;
            });
        });
    });


    // ===== 其他按鈕 =====
    document.getElementById("startBtn").addEventListener("click", () => {
        sessionStorage.removeItem("saved_cards");
        sessionStorage.removeItem("saved_summary");
        sessionStorage.removeItem("saved_music");
        window.location.href = "/select";
    });

    // ===== 介紹 Modal =====
    introBtn.addEventListener("click", () => { introModal.style.display = "flex"; });
    closeIntro.addEventListener("click", () => { introModal.style.display = "none"; });
    window.addEventListener("click", (e) => { if (e.target === introModal) introModal.style.display = "none"; });

    // ===== 卡牌名稱 Modal =====
    closeCardName.addEventListener("click", () => cardNameModal.style.display = "none");
    window.addEventListener("click", e => { if (e.target === cardNameModal) cardNameModal.style.display = "none"; });

});
