// ================= 自訂警示框 =================
function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");

    if (!modal || !msgBox || !btn) {
        alert(msg);
        return;
    }

    msgBox.textContent = msg;
    modal.style.display = "flex";
    btn.onclick = () => {
        modal.style.display = "none";
    };
}

// ================= DOMContentLoaded =================
document.addEventListener("DOMContentLoaded", async () => {

    // 清除上一輪占卜資料
    sessionStorage.removeItem("saved_cards");
    sessionStorage.removeItem("saved_summary");
    sessionStorage.removeItem("saved_music");

    const cardBack = document.getElementById("cardBack");
    const fanContainer = document.getElementById("fanContainer");
    const cardNameModal = document.getElementById("cardNameModal");
    const closeCardName = document.getElementById("closeCardName");

    const introBtn = document.getElementById("introBtn");
    const introModal = document.getElementById("introModal");
    const closeIntro = document.getElementById("closeIntro");

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

    function getCardImagePath(name) {
        const major = ["愚人", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱者",
            "命運之輪", "正義", "倒吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽",
            "審判", "世界"
        ];
        let folder = major.includes(name) ? "大阿爾克" :
            name.includes("聖杯") ? "聖杯" :
                name.includes("錢幣") ? "錢幣" :
                    name.includes("寶劍") ? "寶劍" :
                        name.includes("權杖") ? "權杖" : "其他";
        return `/static/images/${folder}/${name}.png`;
    }

    document.body.style.overflow = 'hidden';

    // =============== 卡背滑鼠傾斜效果 ===============
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

    // =============== 展示塔羅牌扇形 ===============
    cardBack.addEventListener("click", async () => {
        document.body.style.overflow = 'auto';
        cardBack.style.display = "none";
        fanContainer.style.display = "block";

        const total = tarotCards.length;
        const half = Math.ceil(total / 5 * 3);
        const cardWidth = 100;
        const centerX = fanContainer.clientWidth / 2;
        const centerYTop = 30;
        const centerYBottom = 295;
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
            card.style.top = `${centerYTop}px`;
            card.style.transform = "rotate(0deg) scale(0)";
            card.style.zIndex = i;
            fanContainer.appendChild(card);

            setTimeout(() => {
                let angleDeg, radius, yOffset, centerY;
                if (i < half) {
                    angleDeg = angleStartTop + i * angleStepTop;
                    radius = radiusTop;
                    centerY = centerYTop;
                } else {
                    const idx = i - half;
                    angleDeg = angleStartBottom + idx * angleStepBottom;
                    radius = radiusBottom;
                    centerY = centerYBottom;
                }

                yOffset = radius * (1 - Math.cos(angleDeg * Math.PI / 180));
                const rad = angleDeg * Math.PI / 180;
                const x = centerX + radius * Math.sin(rad) - cardWidth / 2;
                const y = centerY + yOffset;
                const zOffset = i < half ? (Math.abs(angleDeg) / 4) : (Math.abs(angleDeg) / 5);

                card.style.left = `${x}px`;
                card.style.top = `${y}px`;
                card.style.transform = `rotate(${angleDeg}deg) translateZ(${zOffset}px) scale(1)`;
                card.style.opacity = 1;

            }, i * 10);

            // 點擊卡片顯示大圖 Modal
            card.addEventListener("click", (e) => {
                closeAllModals();
                e.stopPropagation();
                const modalOverlay = document.getElementById("modalOverlay");
                const modalCard = document.getElementById("modalCard");
                const modalCardName = document.getElementById("modalCardName");
                modalCard.src = getCardImagePath(name);
                modalCardName.textContent = name;
                modalOverlay.classList.add("active");
                modalCard.classList.add("active");
                modalCardName.style.display = "block";
                modalCardName.style.transform = "translateX(-50%) scale(1)";
                modalCardName.style.opacity = "1";
            });
        });

        // 點擊 Modal Overlay 關閉
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

    // ================= 開始占卜按鈕 =================
    document.getElementById("startBtn").addEventListener("click", () => {
        sessionStorage.removeItem("saved_cards");
        sessionStorage.removeItem("saved_summary");
        sessionStorage.removeItem("saved_music");
        window.location.href = "/select";
    });

    // 介紹 Modal
    introBtn.addEventListener("click", () => {
        closeAllModals();
        introModal.style.display = "flex";
    });
    closeIntro.addEventListener("click", () => { introModal.style.display = "none"; });
    window.addEventListener("click", (e) => {
        if (e.target === introModal) introModal.style.display = "none";
    });

    // ================= 卡名 Modal =================
    closeCardName.addEventListener("click", () => cardNameModal.style.display = "none");
    window.addEventListener("click", e => {
        if (e.target === cardNameModal) cardNameModal.style.display = "none";
    });
});
