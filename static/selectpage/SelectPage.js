
// 顯示自訂警示框
function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");

    msgBox.textContent = msg;
    modal.style.display = "flex";

    btn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; }
}

document.addEventListener("DOMContentLoaded", async () => {
    const categorySelect = document.getElementById("categorySelect");
    const subquestionText = document.getElementById("subquestionInput").value.trim();
    categorySelect.selectedIndex = 0; // 選回第一個 option
    subquestionText.value = "";

    // 取得問題類型
    const catRes = await fetch("/api/categories");
    const categories = await catRes.json();
    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
    });

    const spreadCards = document.querySelectorAll('.spread-card');
    if (spreadCards.length === 0) {
        console.warn("No elements with class 'spread-card' found.");
        // Optionally, show an alert:
    } else {
        spreadCards.forEach(card => {
            card.addEventListener('click', () => {
                const count = card.dataset.count;
                const categoryId = document.getElementById("categorySelect").value;
                const CategoryName = document.getElementById("categorySelect").selectedOptions[0].textContent;
                const subquestionText = document.getElementById("subquestionInput").value.trim();
                if (!categoryId || !subquestionText) {
                    showAlert("請先選擇問題類型與子問題！");
                    return;
                }
                sessionStorage.setItem("category_id", categoryId);
                sessionStorage.setItem("category_name", CategoryName);
                sessionStorage.setItem("subquestion_text", subquestionText);
                sessionStorage.setItem("count", count);
                console.log("Selected category:", CategoryName);
                window.location.href = "/tarot";
            });
        });
    }

    window.addEventListener("pageshow", () => {
        sessionStorage.removeItem("category_id");
        sessionStorage.removeItem("category_name");
        sessionStorage.removeItem("subquestion_text");
        sessionStorage.removeItem("count");

        const categorySelect = document.getElementById("categorySelect");
        const subquestionInput = document.getElementById("subquestionInput");
        if (categorySelect) categorySelect.selectedIndex = 0;
        if (subquestionInput) subquestionInput.value = "";
    });

});