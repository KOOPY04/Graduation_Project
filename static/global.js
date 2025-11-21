// ================= 全域認證模組 =================
// 存放在 /static/global.js
class GlobalAuth {
    constructor() {
        this.token = localStorage.getItem("token");
        this.userId = sessionStorage.getItem("user_id");

        // 初始先隱藏按鈕，避免閃爍
        const loginBtn = document.getElementById("login-btn");
        const registerBtn = document.getElementById("register-btn");

        if (loginBtn) loginBtn.style.visibility = "hidden";
        if (registerBtn) registerBtn.style.visibility = "hidden";
    }

    // 檢查是否已登入，並更新 UI
    async checkLogin() {
        const loginBtn = document.getElementById("login-btn");
        const registerBtn = document.getElementById("register-btn");
        const logoutBtn = document.getElementById("logoutBtn");
        const dropdown = document.getElementById("userDropdown");

        if (!loginBtn || !registerBtn) return false;

        try {
            const res = await fetch("/api/me", { credentials: "include" });
            if (!res.ok) throw new Error();
            const user = await res.json();

            sessionStorage.setItem("user_id", user.user_id);
            sessionStorage.setItem("user_name", user.name || "使用者");
            sessionStorage.setItem("user_avatar", user.picture || "/static/images/default_avatar.webp");
            sessionStorage.setItem("auth_provider", user.auth_provider || "local");

            if (sessionStorage.getItem("justLoggedInByGoogle") === "true") {
                sessionStorage.removeItem("justLoggedInByGoogle");
                location.reload();
            }

            const avatar = sessionStorage.getItem("user_avatar");
            const name = sessionStorage.getItem("user_name");

            loginBtn.innerHTML = `<img src="${avatar}" class="user-avatar" />
            <span>嗨，${name} 👋</span>`;

            loginBtn.style.visibility = "visible";
            registerBtn.style.visibility = "none";
            if (logoutBtn) logoutBtn.style.visibility = "block";
            loginBtn.style.display = "flex";
            registerBtn.style.display = "none";
            if (logoutBtn) logoutBtn.style.display = "block";

            loginBtn.onclick = (e) => {
                e.stopPropagation();
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                }
            };

            return true;
        } catch {
            loginBtn.textContent = "登入";
            loginBtn.style.display = "flex";
            registerBtn.style.display = "flex";
            if (logoutBtn) logoutBtn.style.display = "none";

            // ✅ 顯示按鈕
            loginBtn.style.visibility = "visible";
            registerBtn.style.visibility = "visible";
            if (logoutBtn) logoutBtn.style.visibility = "visible";

            loginBtn.onclick = () => {
                closeAllModals();
                const loginModal = document.getElementById("loginModal");
                if (loginModal) loginModal.style.display = "flex";
            };

            return false;
        }
    }

    

    // 登入
    async login(email, password) {
        try {
            const resp = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                })
            });

            const data = await resp.json();

            if (resp.ok) {
                localStorage.setItem("token", data.access_token);
                this.token = data.access_token;

                // 獲取用戶 ID
                const meRes = await fetch("/api/me", {
                    headers: { "Authorization": `Bearer ${data.access_token}` }
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    sessionStorage.setItem("user_id", meData.user_id);
                    this.userId = meData.user_id;

                    // 登入成功後上傳占卜紀錄
                    // await this.uploadTarotRecord(data.access_token, meData.user_id);
                }

                return { success: true };
            } else {
                return { success: false, error: data.error || "登入失敗" };
            }
        } catch (err) {
            console.error("登入錯誤:", err);
            return { success: false, error: "登入發生錯誤" };
        }
    }

    // 註冊
    async register(email, password, name) {
        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name })
            });

            const result = await res.json();

            if (res.ok) {
                // 註冊成功後，自動用同一個帳號登入
                return await this.login(email, password);
            }

            return { success: false, error: result.error || result.message || "註冊失敗" };
        } catch (err) {
            console.error("註冊錯誤:", err);
            return { success: false, error: "註冊時發生錯誤" };
        }
    }

    // 登出
    async logout() {
        try {
            localStorage.removeItem("token");
            sessionStorage.removeItem("user_id");
            sessionStorage.removeItem("user_name");
            sessionStorage.removeItem("user_avatar");
            this.token = null;
            this.userId = null;
            await fetch("/api/logout", { method: "POST" });
            return { success: true };
        } catch (err) {
            console.error("登出錯誤:", err);
            return { success: false };
        }
    }

    // 取得存取權杖
    getToken() {
        return this.token || localStorage.getItem("token");
    }

    // 取得使用者 ID
    getUserId() {
        return this.userId || sessionStorage.getItem("user_id");
    }

    // 是否已登入
    isLoggedIn() {
        return !!this.getToken();
    }

    init() {
        this.setupLoginLogic();
        this.setupRegisterLogic();
        this.setupLogoutLogic();
        this.setupDropdown();
        this.setupAccountSettings();
        this.setupRecordBtn();
        this.setupContactForm();
        this.checkLogin();
    }

    // ================= 登入表單 =================
    setupLoginLogic() {
        const loginModal = document.getElementById("loginModal");
        const closeLogin = document.getElementById("closeLogin");
        const loginForm = document.getElementById("loginForm");
        const googleLoginBtn = document.getElementById("googleLoginBtn");
        const loginError = document.getElementById("loginError");

        if (!loginForm) return;

        // 開啟按鈕
        if (closeLogin) closeLogin.addEventListener("click", () => {
            loginModal.style.display = "none";
            clearForm(loginForm);
        });

        // 點擊 modal 外部區域時關閉
        if (loginModal) {
            window.addEventListener("click", (e) => {
                if (e.target === loginModal) {
                    loginModal.style.display = "none";
                    clearForm(loginForm);
                }
            });
        }

        // ================= Google 登入按鈕 =================
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener("click", () => {
                // ✅ 保存當前頁面路徑
                const currentPath = window.location.pathname + window.location.search;
                sessionStorage.setItem("returnPath", currentPath);
                sessionStorage.setItem("justLoggedInByGoogle", "true");
                window.location.href = "/login/google";
            });
        }

        // ================= 登入表單提交 =================
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const result = await this.login(email, password);

                if (result.success) {
                    loginForm.reset();
                    if (loginError) loginError.style.display = "none";
                    showAlert("登入成功 🌟");
                    if (loginModal) loginModal.style.display = "none";

                    // ✅ 重新整理頁面UI，不跳轉
                    this.checkLogin();
                    setTimeout(() => window.location.reload(), 500);
                } else if (loginError) {
                    loginError.textContent = result.error;
                    loginError.style.display = "block";
                }
            } catch (err) {
                console.error(err);
                if (loginError) {
                    loginError.textContent = "登入失敗，請稍後再試";
                    loginError.style.display = "block";
                }
            }
        });
    }

    // ================= 註冊表單 =================
    setupRegisterLogic() {
        const registerBtn = document.getElementById("register-btn");
        const registerModal = document.getElementById("registerModal");
        const closeRegister = document.getElementById("closeRegister");
        const registerForm = document.getElementById("registerForm");
        const registerMessage = document.getElementById("registerMessage");

        if (!registerForm) return;

        // 開啟按鈕
        if (registerBtn && registerModal) {
            registerBtn.addEventListener("click", () => {
                closeAllModals();
                registerModal.style.display = "flex";
            });
        }

        // 關閉按鈕
        if (closeRegister && registerModal) {
            closeRegister.addEventListener("click", () => {
                registerModal.style.display = "none";
                clearForm(registerForm);
            });
        }

        // 點擊 modal 外部區域時關閉
        if (registerModal) {
            window.addEventListener("click", (e) => {
                if (e.target === registerModal) {
                    registerModal.style.display = "none";
                    clearForm(registerForm);
                }
            });
        }

        // ================= 註冊表單提交 =================
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("registerEmail").value;
            const password = document.getElementById("registerPassword").value;
            const name = document.getElementById("registerName").value;

            try {
                const result = await this.register(email, password, name);
                if (registerMessage) {
                    registerMessage.textContent = result.error || "註冊成功，請查看 Email";
                    registerMessage.style.color = result.success ? "green" : "red";
                }
                if (result.success) {
                    registerForm.reset();
                    showAlert("註冊成功 ✅，已自動登入！");
                    setTimeout(() => {
                        if (registerModal) registerModal.style.display = "none";
                        // ✅ 重新整理頁面UI，不跳轉
                        this.checkLogin();
                        window.location.reload();
                    }, 800);
                }
            } catch (err) {
                console.error(err);
                if (registerMessage) {
                    registerMessage.textContent = "註冊失敗，請稍後再試";
                    registerMessage.style.color = "red";
                }
            }
        });
    }

    // ================= 登出按鈕 =================
    setupLogoutLogic() {
        const logoutBtn = document.getElementById("logoutBtn");
        if (!logoutBtn) return;
        logoutBtn.addEventListener("click", async () => {
            await this.logout();
            showAlert("您已成功登出 🌙");
            this.checkLogin();
            setTimeout(() => window.location.reload(), 500);
            const dropdown = document.getElementById("userDropdown");
            if (dropdown) dropdown.style.display = "none";
        });
    }

    // ================= 使用者下拉選單 =================
    setupDropdown() {
        const dropdown = document.getElementById("userDropdown");
        if (!dropdown) return;
        window.addEventListener("click", (e) => {
            if (!e.target.closest("#userDropdown") && !e.target.closest("#login-btn")) {
                dropdown.style.display = "none";
            }
        });
    }

    // ================= 帳戶設定模態框 =================
    setupAccountSettings() {
        const accountSettingsBtn = document.getElementById("accountSettingsBtn");
        const accountSettingsModal = document.getElementById("accountSettingsModal");
        const closeAccountSettings = document.getElementById("closeAccountSettings");
        const token = localStorage.getItem("token");

        const nameInput = document.getElementById("name");
        const profileBtn = accountSettingsModal?.querySelector(".accordion-item:nth-child(1) .btn");

        const avatarInput = document.getElementById("avatarInput");
        const avatarPreview = document.getElementById("avatarPreview");
        const avatarBtn = accountSettingsModal?.querySelector(".accordion-item:nth-child(2) .btn");

        // const oldPassword = document.getElementById("oldPassword");
        // const newPassword = document.getElementById("newPassword");
        // const confirmPassword = document.getElementById("confirmPassword");
        // const passwordBtn = accountSettingsModal?.querySelector(".accordion-item:nth-child(3) .btn");

        // 開啟按鈕
        if (accountSettingsBtn && accountSettingsModal) {
            accountSettingsBtn.addEventListener("click", () => {
                closeAllModals();
                accountSettingsModal.style.display = "flex";

                const hasPassword = sessionStorage.getItem("has_password");
                if (hasPassword === "true") {
                    setSection.style.display = "none";
                    changeSection.style.display = "block";
                } else {
                    setSection.style.display = "block";
                    changeSection.style.display = "none";
                }
            });
        }

        // 關閉按鈕
        if (closeAccountSettings && accountSettingsModal) {
            closeAccountSettings.addEventListener("click", () => {
                accountSettingsModal.style.display = "none";
                clearAccountSettings();
            });
        }

        // 點擊 modal 外部區域時關閉
        if (accountSettingsModal) {
            window.addEventListener("click", (e) => {
                if (e.target === accountSettingsModal) {
                    accountSettingsModal.style.display = "none";
                    clearAccountSettings();
                }
            });
        }

        // ===== 手風琴效果 =====
        document.querySelectorAll(".accordion-header").forEach(btn => {
            btn.addEventListener("click", () => {
                const content = btn.nextElementSibling;
                const isOpen = content.style.display === "block";
                document.querySelectorAll(".accordion-content").forEach(c => c.style.display = "none");
                content.style.display = isOpen ? "none" : "block";
            });
        });

        // ===== 大頭貼預覽 =====
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

        // ===== 載入使用者資料 =====
        const setSection = document.getElementById("setPasswordSection");
        const changeSection = document.getElementById("changePasswordSection");

        const loadProfile = async () => {
            if (!token || !nameInput) return;
            const res = await fetch("/api/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return;
            const user = await res.json();

            nameInput.value = user.name || "";
            if (avatarPreview) {
                avatarPreview.src = user.avatar
                    ? (user.avatar.startsWith("/static/") ? user.avatar : `/static/${user.avatar}`)
                    : "/static/images/default_avatar.webp";
            }

            // ✅ 判斷 Google 首次登入
            if (user.auth_provider === "google" && !user.password_hash) {
                setSection.style.display = "block";
                changeSection.style.display = "none";
            } else {
                setSection.style.display = "none";
                changeSection.style.display = "block";
            }

        };
        loadProfile();

        // ===== 更新個人資料 =====
        if (profileBtn) {
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
                        this.checkLogin();
                        nameInput.value = "";
                    } else {
                        showAlert(data.detail || "更新失敗");
                    }
                } catch (err) {
                    console.error(err);
                    showAlert("更新發生錯誤");
                }
            });
        }

        // ===== 更新大頭貼 =====
        if (avatarBtn) {
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
                        sessionStorage.setItem("user_avatar", data.avatar);
                        this.checkLogin();
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
        }

        // ===== 更新密碼 =====
        const setPasswordBtn = document.getElementById("setPasswordBtn");
        if (setPasswordBtn) {
            setPasswordBtn.addEventListener("click", async () => {
                const newPassword = document.getElementById("setNewPassword").value;
                const confirmPassword = document.getElementById("setConfirmPassword").value;

                if (newPassword !== confirmPassword) {
                    return showAlert("新密碼與確認密碼不一致！");
                }

                try {
                    const res = await fetch("/api/set-password", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        showAlert("密碼設定成功！");
                        setSection.style.display = "none";
                        changeSection.style.display = "block";

                        // ✅ 將使用者狀態存下來，避免下次再判斷錯誤
                        sessionStorage.setItem("has_password", "true");

                        // 清空欄位
                        document.getElementById("setNewPassword").value = "";
                        document.getElementById("setConfirmPassword").value = "";
                    } else {
                        showAlert(data.detail || "設定密碼失敗");
                    }
                } catch (err) {
                    console.error(err);
                    showAlert("更新發生錯誤");
                }
            });
        }



    }
    // ================ 查看占卜紀錄按鈕 =================
    setupRecordBtn() {
        const recordBtn = document.getElementById("recordBtn");
        if (recordBtn) recordBtn.addEventListener("click", () => window.location.href = "/records");
    }

    // ================= 聯絡我們表單 =================
    setupContactForm() {
        const contactBtn = document.getElementById("contactBtn");
        const contactModal = document.getElementById("contactModal");
        const closeContact = document.getElementById("closeContact");
        const contactForm = document.getElementById("contactForm");
        const contactMessage = document.getElementById("contactMessage");

        if (!contactForm) return;

        if (contactBtn && contactModal) {
            contactBtn.addEventListener("click", () => {
                closeAllModals();
                contactModal.style.display = "flex";
            });
        }

        if (closeContact && contactModal) {
            closeContact.addEventListener("click", () => {
                contactModal.style.display = "none";
                clearForm(contactForm);
            });
        }

        if (contactModal) {
            window.addEventListener("click", (e) => {
                if (e.target === contactModal) {
                    contactModal.style.display = "none";
                    clearForm(contactForm);
                }
            });
        }

        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!contactMessage) return;
            contactMessage.textContent = "正在送出...";

            const formData = new FormData(contactForm);

            try {
                const res = await fetch("/api/contact", {
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
        });
    }
}

const globalAuth = new GlobalAuth();

// ================= 自訂警示框 =================
function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");

    if (!modal || !msgBox || !btn) return alert(msg);

    msgBox.textContent = msg;
    modal.style.display = "flex";
    btn.onclick = () => { modal.style.display = "none"; };
}

// ================= 工具函數 =================
function clearForm(form) {
    if (!form) return;
    form.reset();
}

function clearAccountSettings() {
    const nameInput = document.getElementById("name");
    const avatarInput = document.getElementById("avatarInput");
    const oldPassword = document.getElementById("oldPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const avatarPreview = document.getElementById("avatarPreview");

    if (nameInput) nameInput.value = "";
    if (avatarInput) avatarInput.value = "";
    if (oldPassword) oldPassword.value = "";
    if (newPassword) newPassword.value = "";
    if (confirmPassword) confirmPassword.value = "";
    if (avatarPreview) {
        avatarPreview.src = "/static/images/default_avatar.webp";
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
        modal.style.display = "none";
    });

    const customAlert = document.getElementById("customAlert");
    if (customAlert) customAlert.style.display = "none";

    const dropdown = document.getElementById("userDropdown");
    if (dropdown) dropdown.style.display = "none";
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Global JS 已加載");
    globalAuth.init();
});