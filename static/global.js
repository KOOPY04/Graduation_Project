/* global.js */

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

// ================= 檢查登入狀態 =================
async function checkLogin() {
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");
    const logoutBtn = document.getElementById("logoutBtn");
    const dropdown = document.getElementById("userDropdown");

    if (!loginBtn || !registerBtn || !logoutBtn || !dropdown) {
        console.warn("⚠️ 登入相關元素不存在，跳過 checkLogin()");
        return;
    }

    try {
        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
            console.warn("⚠️ /api/me 回傳狀態：", res.status);
            throw new Error("未登入");
        }

        const text = await res.text();
        if (!text) throw new Error("空回應");
        const user = JSON.parse(text);

        console.log("📦 使用者資料：", user);
        sessionStorage.setItem("user_id", user.user_id);

        // 更新登入按鈕外觀
        const avatarImg = document.createElement("img");
        avatarImg.src = user.picture || "/static/images/profile_icon.png";
        avatarImg.alt = "頭像";
        avatarImg.className = "user-avatar";

        loginBtn.innerHTML = "";
        loginBtn.appendChild(avatarImg);

        const textSpan = document.createElement("span");
        textSpan.textContent = `嗨，${user.name || "使用者"} 👋`;
        loginBtn.appendChild(textSpan);

        loginBtn.style.display = "flex";
        registerBtn.style.display = "none";
        logoutBtn.style.display = "block";

        // 綁定開關使用者下拉選單
        loginBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.style.display =
                dropdown.style.display === "block" ? "none" : "block";
        };

    } catch (err) {
        console.warn("🔹 未登入狀態或錯誤：", err);

        loginBtn.textContent = "登入";
        loginBtn.style.display = "flex";
        registerBtn.style.display = "flex";
        logoutBtn.style.display = "none";

        // 重新綁定登入 modal
        loginBtn.onclick = () => {
            const loginModal = document.getElementById("loginModal");
            if (loginModal) loginModal.style.display = "flex";
        };
    }
}

// ================= 初始化登入 / 註冊 / 登出事件 =================
function initAuthEvents() {
    const loginModal = document.getElementById("loginModal");
    const closeLogin = document.getElementById("closeLogin");
    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");
    const googleLoginBtn = document.getElementById("googleLoginBtn");

    const registerModal = document.getElementById("registerModal");
    const closeRegister = document.getElementById("closeRegister");
    const registerForm = document.getElementById("registerForm");
    const registerMessage = document.getElementById("registerMessage");

    const logoutBtn = document.getElementById("logoutBtn");
    const dropdown = document.getElementById("userDropdown");
    const registerBtn = document.getElementById("register-btn");

    // 登入 Modal 關閉
    if (closeLogin && loginModal) {
        closeLogin.addEventListener("click", () => loginModal.style.display = "none");
        window.addEventListener("click", (e) => {
            if (e.target === loginModal) loginModal.style.display = "none";
        });
    }

    // Google 登入
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", () => {
            window.location.href = "/login/google";
        });
    }

     // 點擊「註冊」按鈕開啟註冊 Modal
    if (registerBtn && registerModal) {
        registerBtn.addEventListener("click", () => {
            registerModal.style.display = "flex";
        });
    }

    // 登入表單
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (loginError) loginError.style.display = "none";

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const resp = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ username: email, password })
                });

                const text = await resp.text();
                let data = {};
                try { data = JSON.parse(text); } catch {}

                if (resp.ok) {
                    localStorage.setItem("token", data.access_token || "");

                    // 再次確認使用者資料
                    const meRes = await fetch("/api/me", { credentials: "include" });
                    if (meRes.ok) {
                        const meText = await meRes.text();
                        const meData = JSON.parse(meText);
                        sessionStorage.setItem("user_id", meData.user_id);
                    }

                    if (loginModal) loginModal.style.display = "none";
                    showAlert("登入成功 🌟");
                    checkLogin();
                } else {
                    if (loginError) {
                        loginError.textContent = data.error || "登入失敗";
                        loginError.style.display = "block";
                    }
                }
            } catch (err) {
                console.error("登入錯誤：", err);
                if (loginError) {
                    loginError.textContent = "登入發生錯誤";
                    loginError.style.display = "block";
                }
            }
        });
    }

    // 登出
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                localStorage.removeItem("token");
                await fetch("/api/logout", { method: "POST" });
                showAlert("您已成功登出 🌙");
            } catch (err) {
                console.error("登出發生錯誤：", err);
                showAlert("登出時發生錯誤");
            } finally {
                checkLogin();
                if (dropdown) dropdown.style.display = "none";
            }
        });
    }

    // 註冊 Modal
    if (registerModal && closeRegister) {
        closeRegister.addEventListener("click", () => registerModal.style.display = "none");
        window.addEventListener("click", (e) => {
            if (e.target === registerModal) registerModal.style.display = "none";
        });
    }

    // 註冊表單
    if (registerForm) {
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

                const text = await res.text();
                const result = text ? JSON.parse(text) : {};
                if (registerMessage) {
                    registerMessage.textContent = result.message || result.error || "";
                }

                if (res.ok) {
                    showAlert("註冊成功 ✅，請查看 Email！");
                    setTimeout(() => registerModal.style.display = "none", 1500);
                }
            } catch (err) {
                console.error(err);
                if (registerMessage) {
                    registerMessage.textContent = "註冊時發生錯誤";
                }
            }
        });
    }

    // 點擊畫面其他地方關閉使用者選單
    window.addEventListener("click", (e) => {
        if (dropdown && !e.target.closest("#userDropdown") && !e.target.closest("#login-btn")) {
            dropdown.style.display = "none";
        }
    });

    // 使用者選單導向
    const navMap = {
        profileBtn: "/profile",
        avatarBtn: "/change-avatar",
        accountSettingsBtn: "/account-settings",
        recordBtn: "/records",
        helpBtn: "/help",
        contactBtn: "/contact"
    };

    Object.entries(navMap).forEach(([id, url]) => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = () => window.location.href = url;
    });
}

// ================= 初始化 =================
document.addEventListener("DOMContentLoaded", () => {
    checkLogin();
    initAuthEvents();
});
