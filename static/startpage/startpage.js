document.addEventListener("DOMContentLoaded", () => {
    const cardBack = document.getElementById("cardBack");
    const fanContainer = document.getElementById("fanContainer");
    const cardNameModal = document.getElementById("cardNameModal");
    const closeCardName = document.getElementById("closeCardName");
    const introBtn = document.getElementById("introBtn");
    const introModal = document.getElementById("introModal");
    const closeIntro = document.getElementById("closeIntro");

    const tarotCards = ["權杖首牌", "權杖二", "權杖三", "權杖四", "權杖五", "權杖六", "權杖七", "權杖八", "權杖九", "權杖十", "權杖侍從", "權杖騎士", "權杖皇后", "權杖國王",
        "聖杯首牌", "聖杯二", "聖杯三", "聖杯四", "聖杯五", "聖杯六", "聖杯七", "聖杯八", "聖杯九", "聖杯十", "聖杯侍從", "聖杯騎士", "聖杯皇后", "聖杯國王",
        "寶劍首牌", "寶劍二", "寶劍三", "寶劍四", "寶劍五", "寶劍六", "寶劍七", "寶劍八", "寶劍九", "寶劍十", "寶劍侍從", "寶劍騎士", "寶劍皇后", "寶劍國王",
        "錢幣首牌", "錢幣二", "錢幣三", "錢幣四", "錢幣五", "錢幣六", "錢幣七", "錢幣八", "錢幣九", "錢幣十", "錢幣侍從", "錢幣騎士", "錢幣皇后", "錢幣國王",
        "愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者", "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽", "審判", "世界"
    ];

    function getCardImagePath(name) {
        const major = ["愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者", "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽", "審判", "世界"];
        let folder = "";
        if (major.includes(name)) folder = "大阿爾克";
        else if (name.includes("聖杯")) folder = "聖杯";
        else if (name.includes("錢幣")) folder = "錢幣";
        else if (name.includes("寶劍")) folder = "寶劍";
        else if (name.includes("權杖")) folder = "權杖";
        else folder = "其他";
        return `/static/images/${folder}/${name}.png`;
    }

    document.body.style.overflow = 'hidden';

    // 滑鼠移動時讓卡背根據滑鼠位置傾斜
    cardBack.addEventListener("mousemove", (e) => {
        const rect = cardBack.getBoundingClientRect();
        const x = e.clientX - rect.left; // 滑鼠在卡片中的 X 座標
        const y = e.clientY - rect.top;  // 滑鼠在卡片中的 Y 座標
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // 偏移比例（-1 到 1）
        const rotateX = ((y - centerY) / centerY) * 10;  // 上下傾斜
        const rotateY = ((centerX - x) / centerX) * 10;  // 左右傾斜

        cardBack.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        cardBack.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 25px rgba(0,0,0,0.5)`;
    });

    // 滑鼠離開時回復原位
    cardBack.addEventListener("mouseleave", () => {
        cardBack.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
        cardBack.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";
    });


    cardBack.addEventListener("click", () => {
        document.body.style.overflow = 'auto';
        cardBack.style.display = "none";
        fanContainer.style.display = "block";

        const total = tarotCards.length;
        const half = Math.ceil(total / 5 * 3);
        console.log(half);
        const cardWidth = 100;
        const centerX = fanContainer.clientWidth / 2;
        const centerYTop = 30;   // 上排中心 Y
        const centerYBottom = 295; // 下排中心 Y
        const radiusTop = 650;
        const radiusBottom = 350;
        const angleStartTop = -40;
        const angleEndTop = 40;
        const angleStepTop = (angleEndTop - angleStartTop) / (half - 1);
        const angleStartBottom = -40;
        const angleEndBottom = 40;
        const angleStepBottom = (angleEndBottom - angleStartBottom) / (total - half - 1);

        tarotCards.forEach((name, i) => {
            const card = document.createElement("img");
            card.src = getCardImagePath(name);
            card.className = "card";
            card.dataset.index = i;
            card.style.opacity = 0;
            card.style.left = `${centerX - cardWidth / 2}px`;
            card.style.top = `${centerYTop}px`; // 初始位置隨便
            card.style.transform = `rotate(0deg) scale(0)`;
            card.style.zIndex = i;


            fanContainer.appendChild(card);

            setTimeout(() => {
                let angleDeg, radius, yOffset, centerY;
                if (i < half) {
                    // 上排
                    angleDeg = angleStartTop + i * angleStepTop;
                    radius = radiusTop;
                    centerY = centerYTop;
                } else {
                    // 下排
                    const idx = i - half;
                    angleDeg = angleStartBottom + idx * angleStepBottom;
                    radius = radiusBottom;
                    centerY = centerYBottom;
                }

                // yOffset 往下
                yOffset = radius * (1 - Math.cos(angleDeg * Math.PI / 180));
                const rad = angleDeg * Math.PI / 180;
                const x = centerX + radius * Math.sin(rad) - cardWidth / 2;
                const y = centerY + yOffset;

                card.style.left = `${x}px`;
                card.style.top = `${y}px`;
                // card.style.transform = `rotate(${angleDeg}deg) scale(1)`;
                const zOffset = i < half ? (Math.abs(angleDeg) / 4) : (Math.abs(angleDeg) / 5);
                card.style.transform = `rotate(${angleDeg}deg) translateZ(${zOffset}px) scale(1)`;
                card.style.opacity = 1;
            }, i * 10);

            card.addEventListener("click", (e) => {
                e.stopPropagation(); // 避免觸發 window 點擊事件

                const modalOverlay = document.getElementById("modalOverlay");
                const modalCard = document.getElementById("modalCard");
                const modalCardName = document.getElementById("modalCardName");

                // 設置牌圖片和名稱
                modalCard.src = getCardImagePath(name);
                modalCardName.textContent = name;

                // 顯示
                modalOverlay.classList.add("active");
                modalCard.classList.add("active");
                modalCardName.style.display = "block";
                modalCardName.style.transform = "translateX(-50%) scale(1)";
                modalCardName.style.opacity = "1";


            });

            const modalOverlay = document.getElementById("modalOverlay");
            const modalCard = document.getElementById("modalCard");
            const modalCardName = document.getElementById("modalCardName");

            modalOverlay.addEventListener("click", () => {
                modalOverlay.classList.remove("active");
                modalCard.classList.remove("active");
                modalCardName.style.transform = "translateX(-50%) scale(0)";
                modalCardName.style.opacity = "0";
                setTimeout(() => {
                    modalCardName.style.display = "none";
                }, 150);
            });


        });
    });

    document.getElementById("startBtn").addEventListener("click", () => {
        window.location.href = "/select";
    });
    document.getElementById("introBtn").addEventListener("click", () => {
        document.getElementById("introModal").style.display = "flex";
    });
    closeIntro.addEventListener("click", () => {
        introModal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
        if (e.target === introModal) introModal.style.display = "none";
    });

    // 打開「說明介紹」 
    introBtn.addEventListener("click", () => { introModal.style.display = "flex"; });
    // 關閉「說明介紹」 
    closeIntro.addEventListener("click", () => { introModal.style.display = "none"; }); window.addEventListener("click", (e) => { if (e.target === introModal) { introModal.style.display = "none"; } });

    closeCardName.addEventListener("click", () => cardNameModal.style.display = "none");
    window.addEventListener("click", e => { if (e.target === cardNameModal) cardNameModal.style.display = "none"; });
});