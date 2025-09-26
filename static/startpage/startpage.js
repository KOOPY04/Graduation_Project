// startpage.js
document.addEventListener("DOMContentLoaded", () => {
    const introBtn = document.getElementById("introBtn");
    const introModal = document.getElementById("introModal");
    const closeIntro = document.getElementById("closeIntro");

    // 打開「說明介紹」
    introBtn.addEventListener("click", () => {
        introModal.style.display = "flex";
    });

    // 關閉「說明介紹」
    closeIntro.addEventListener("click", () => {
        introModal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === introModal) {
            introModal.style.display = "none";
        }
    });
});