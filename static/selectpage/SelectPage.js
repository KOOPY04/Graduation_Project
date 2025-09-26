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
    const subquestionSelect = document.getElementById("subquestion");
    const btn3 = document.getElementById("btn3");
    const btn4 = document.getElementById("btn4");

    // 取得問題類型
    const catRes = await fetch("/api/categories");
    const categories = await catRes.json();
    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
    });

    // 依 category 選擇更新子問題
    categorySelect.addEventListener("change", async () => {
        const categoryId = categorySelect.value;
        subquestionSelect.innerHTML = '<option value="">-- 請先選擇子問題 --</option>';
        if (!categoryId) return;

        const res = await fetch(`/api/subquestions/${categoryId}`);
        const data = await res.json();
        data.forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub.id;
            opt.textContent = sub.question;
            subquestionSelect.appendChild(opt);
        });
    });

    function goToDraw(count) {
        const categoryId = categorySelect.value;
        const subquestionId = subquestionSelect.value;
        if (!categoryId || !subquestionId) {
            showAlert("請先選擇問題類型與子問題！");
            return;
        }
        window.location.href = `/tarot?count=${count}&category_id=${categoryId}&subquestion_id=${subquestionId}`;
    }

    btn3.addEventListener("click", () => goToDraw(3));
    btn4.addEventListener("click", () => goToDraw(4));
});
