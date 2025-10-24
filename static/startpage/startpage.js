// ================= 自訂警示框 =================
// function showAlert(msg) {
//     const modal = document.getElementById("customAlert");
//     const msgBox = document.getElementById("customAlertMsg");
//     const btn = document.getElementById("customAlertBtn");

//     if (!modal || !msgBox || !btn) {
//         alert(msg);
//         return;
//     }

//     msgBox.textContent = msg;
//     modal.style.display = "flex";
//     btn.onclick = () => {
//         modal.style.display = "none";
//     };
// }

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

    // const loginBtn = document.getElementById("login-btn");
    // const registerBtn = document.getElementById("register-btn");
    // const loginModal = document.getElementById("loginModal");
    // const closeLogin = document.getElementById("closeLogin");
    // const loginForm = document.getElementById("loginForm");
    // const loginError = document.getElementById("loginError");
    // const googleLoginBtn = document.getElementById("googleLoginBtn");

    // const registerModal = document.getElementById("registerModal");
    // const closeRegister = document.getElementById("closeRegister");
    // const registerForm = document.getElementById("registerForm");
    // const registerMessage = document.getElementById("registerMessage");
    // const contactBtn = document.getElementById("contactBtn");
    // const contactModal = document.getElementById("contactModal");
    // const closeContact = document.getElementById("closeContact");
    // const contactForm = document.getElementById("contactForm");
    // const contactMessage = document.getElementById("contactMessage");

    // // const userId = sessionStorage.getItem("user_id");
    // const token = localStorage.getItem("token");

    // const nameInput = document.getElementById("name");
    // const profileBtn = document.querySelector("#accountSettingsModal .accordion-item:nth-child(1) .btn");

    // const avatarInput = document.getElementById("avatarInput");
    // const avatarPreview = document.getElementById("avatarPreview");
    // const avatarBtn = document.querySelector("#accountSettingsModal .accordion-item:nth-child(2) .btn");

    // const oldPassword = document.getElementById("oldPassword");
    // const newPassword = document.getElementById("newPassword");
    // const confirmPassword = document.getElementById("confirmPassword");
    // const passwordBtn = document.querySelector("#accountSettingsModal .accordion-item:nth-child(3) .btn");


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

    // ================= 其他按鈕 =================
    document.getElementById("startBtn").addEventListener("click", () => {
        sessionStorage.removeItem("saved_cards");
        sessionStorage.removeItem("saved_summary");
        sessionStorage.removeItem("saved_music");
        window.location.href = "/select";
    });

    // 介紹 Modal
    introBtn.addEventListener("click", () => {
        introModal.style.display = "flex";
    });
    closeIntro.addEventListener("click", () => { introModal.style.display = "none"; });
    window.addEventListener("click", (e) => {
        if (e.target === introModal) introModal.style.display = "none";
    });

    closeCardName.addEventListener("click", () => cardNameModal.style.display = "none");
    window.addEventListener("click", e => {
        if (e.target === cardNameModal) cardNameModal.style.display = "none";
    });

    /*
    // ================= 登入 / 註冊 =================
    async function checkLogin() {
        const loginBtn = document.getElementById("login-btn");
        const registerBtn = document.getElementById("register-btn");
        const logoutBtn = document.getElementById("logoutBtn");
        const dropdown = document.getElementById("userDropdown");

        try {
            const res = await fetch("/api/me", { credentials: "include" });
            if (!res.ok) throw new Error();
            const user = await res.json();

            sessionStorage.setItem("user_id", user.user_id);
            sessionStorage.setItem("user_name", user.name || "使用者");
            sessionStorage.setItem("user_avatar", user.picture || "/static/images/profile_icon.png");

            loginBtn.innerHTML = `
            <img src="${sessionStorage.getItem("user_avatar")}" class="user-avatar" />
            <span>嗨，${sessionStorage.getItem("user_name")} 👋</span>
        `;

            loginBtn.style.display = "flex";
            registerBtn.style.display = "none";
            logoutBtn.style.display = "block";

            loginBtn.onclick = e => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
            };

        } catch {
            loginBtn.textContent = "登入";
            loginBtn.style.display = "flex";
            registerBtn.style.display = "flex";
            logoutBtn.style.display = "none";

            loginBtn.onclick = () => {
                closeAllModals(); // 🔹 開新 modal 前先關掉其他 modal
                loginModal.style.display = "flex";
            };

            // loginBtn.onclick = () => { document.getElementById("loginModal").style.display = "flex"; };
        }
    }


    // 點擊畫面其他地方關閉下拉選單
    window.addEventListener("click", (e) => {
        const dropdown = document.getElementById("userDropdown");
        if (!e.target.closest("#userDropdown") && !e.target.closest("#login-btn")) {
            dropdown.style.display = "none";
        }
    });


    checkLogin();

    // 登入 Modal
    // loginBtn.addEventListener("click", () => { loginModal.style.display = "flex"; });
    closeLogin.addEventListener("click", () => { loginModal.style.display = "none"; clearForm(loginForm); });
    // window.addEventListener("click", e => { if (e.target === loginModal) loginModal.style.display = "none"; });

    // Google 登入
    googleLoginBtn.addEventListener("click", () => { window.location.href = "/login/google"; });

    // 登入表單
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.style.display = "none";

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const resp = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username: email, password: password })
            });

            const data = await resp.json();

            if (resp.ok) {
                localStorage.setItem("token", data.access_token);

                const meRes = await fetch("/api/me");
                if (meRes.ok) {
                    const meData = await meRes.json();
                    sessionStorage.setItem('user_id', meData.user_id);
                    console.log("📦 已存 user_id:", meData.user_id);
                }

                loginModal.style.display = "none";
                showAlert("登入成功 🌟");
                clearForm(loginForm);
                checkLogin();
            } else {
                loginError.textContent = data.error || "登入失敗";
                loginError.style.display = "block";
            }
        } catch (err) {
            console.error(err);
            loginError.textContent = "登入發生錯誤";
            loginError.style.display = "block";
        }
        setupModalClear(loginModal, loginForm);
    });

    // 套用


    // 登出
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        try {
            localStorage.removeItem("token");
            await fetch("/api/logout", { method: "POST" });
            showAlert("您已成功登出 🌙");
        } catch (err) {
            console.error("登出發生錯誤：", err);
            showAlert("登出時發生錯誤");
        } finally {
            checkLogin();
            document.getElementById("userDropdown").style.display = "none";
        }
    });

    // 註冊 Modal
    registerBtn.addEventListener("click", () => {
        closeAllModals();
        registerModal.style.display = "flex";
    });
    closeRegister.addEventListener("click", () => { registerModal.style.display = "none"; clearForm(registerForm); });
    // window.addEventListener("click", (e) => { if (e.target === registerModal) registerModal.style.display = "none"; });

    // 註冊表單
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            registerMessage.textContent = result.message || result.error;

            if (res.ok) {
                showAlert("註冊成功 ✅，請查看 Email！");
                clearForm(registerForm);
                setTimeout(() => { registerModal.style.display = "none"; }, 1500);
            }
        } catch (err) {
            console.error(err);
            registerMessage.textContent = "註冊時發生錯誤";
        }
        setupModalClear(registerModal, registerForm);
    });



    // 帳號設定 Modal 開關
    const accountSettingsModal = document.getElementById("accountSettingsModal");
    const accountSettingsBtn = document.getElementById("accountSettingsBtn");
    const closeAccountSettings = document.getElementById("closeAccountSettings");

    accountSettingsBtn.addEventListener("click", () => {
        closeAllModals();
        accountSettingsModal.style.display = "flex";
    });

    closeAccountSettings.addEventListener("click", () => {
        accountSettingsModal.style.display = "none";
        clearAccountSettings();
    });

    // 手風琴功能
    document.querySelectorAll(".accordion-header").forEach(btn => {
        btn.addEventListener("click", () => {
            const content = btn.nextElementSibling;
            const isOpen = content.style.display === "block";
            document.querySelectorAll(".accordion-content").forEach(c => c.style.display = "none");
            content.style.display = isOpen ? "none" : "block";
        });
    });

    // 頭像預覽
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener("change", () => {
            const file = avatarInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => avatarPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });
    }
    // ===== 讀取個人資料 =====
    async function loadProfile() {
        const res = await fetch("/api/me", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        const user = await res.json();
        nameInput.value = user.name || "";
        avatarPreview.src = user.avatar
            ? (user.avatar.startsWith("/static/") ? user.avatar : `/static/${user.avatar}`)
            : "/static/images/default_avatar.png";
    }
    loadProfile();

    // ===== 更新個人資料 =====
    profileBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name: nameInput.value })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert(data.message);
                sessionStorage.setItem("user_name", nameInput.value);
                checkLogin(); // ← 重新渲染右上角按鈕
            } else {
                showAlert(data.detail || "更新失敗");
            }
        } catch (err) {
            console.error(err);
            showAlert("更新發生錯誤");
        }
    });


    // ===== 上傳頭像 =====
    avatarBtn.addEventListener("click", async () => {
        if (!avatarInput.files[0]) return showAlert("請選擇圖片");

        const file = avatarInput.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/avatar", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                // ✅ 更新右上角 & 左側頭像
                sessionStorage.setItem("user_avatar", data.avatar);
                checkLogin();
                avatarPreview.src = data.avatar.startsWith("/static/") ? data.avatar : `/static/${data.avatar}`;
                showAlert(data.message);
            } else {
                showAlert(data.detail || "更新失敗");
            }
        } catch (err) {
            console.error(err);
            showAlert("更新發生錯誤");
        }
    });

    // ===== 更新密碼 =====
    passwordBtn.addEventListener("click", async () => {
        if (newPassword.value !== confirmPassword.value) return showAlert("新密碼與確認密碼不一致");
        try {
            const res = await fetch("/api/password", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    old_password: oldPassword.value,
                    new_password: newPassword.value,
                    confirm_password: confirmPassword.value
                })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert(data.message);

                // ✅ 清空欄位
                oldPassword.value = "";
                newPassword.value = "";
                confirmPassword.value = "";

            } else {
                showAlert(data.detail || "更新失敗");
            }
        } catch (err) {
            console.error(err);
            showAlert("更新發生錯誤");
        }
    });



    // ===== 頭像即時預覽 =====
    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => avatarPreview.src = e.target.result;
        reader.readAsDataURL(file);
    });

    contactBtn.addEventListener("click", () => {
        closeAllModals();
        contactModal.style.display = "flex";
    });

    closeContact.addEventListener("click", () => {
        contactModal.style.display = "none";
    });

    // 點外部關閉
    window.addEventListener("click", (e) => {
        if (e.target === contactModal) contactModal.style.display = "none";
        // clearAccountSettings();
    });

    // 送出表單
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        contactMessage.textContent = "正在送出...";

        const formData = new FormData(contactForm);

        try {
            const res = await fetch("/contact", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                contactMessage.style.color = "green";
                contactMessage.textContent = data.message;
                clearForm(contactForm);
            } else {
                contactMessage.style.color = "red";
                contactMessage.textContent = data.detail || "送出失敗";
            }
        } catch (err) {
            contactMessage.style.color = "red";
            contactMessage.textContent = "送出失敗，請稍後再試";
            console.error(err);
        }
        setupModalClear(contactModal, contactForm);
    });

    function clearAccountSettings() {
        nameInput.value = "";
        avatarInput.value = "";
        oldPassword.value = "";
        newPassword.value = "";
        confirmPassword.value = "";
    }

    // ================= 關閉所有已開啟的 modal =================
    function closeAllModals() {
        const modals = document.querySelectorAll(".modal");
        modals.forEach(modal => {
            modal.style.display = "none";
        });

        // 若有自訂 alert 或其他特殊 modal，也可一併關閉
        const customAlert = document.getElementById("customAlert");
        if (customAlert) customAlert.style.display = "none";

        const dropdown = document.getElementById("userDropdown");
        if (dropdown) dropdown.style.display = "none";
    }

    // 使用者選單導向
    document.getElementById("recordBtn").onclick = () => window.location.href = "/records";
});

function clearForm(form) {
    if (!form) return;
    form.reset(); // 清空 input、textarea、select
}
*/
// 正確關閉 DOMContentLoaded 監聽器
});

// function setupModalClear(modal, form) {
//     const closeBtns = modal.querySelectorAll(".close-btn");

//     closeBtns.forEach(btn => {
//         btn.addEventListener("click", () => {
//             modal.style.display = "none";
//             clearForm(form);
//         });
//     });

//     window.addEventListener("click", e => {
//         if (e.target === modal) {
//             modal.style.display = "none";
//             clearForm(form);
//         }
//     });
// }
// });

