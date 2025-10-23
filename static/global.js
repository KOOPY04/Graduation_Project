// ================= 全域認證模組 =================
// 存放在 /static/global.js

class GlobalAuth {
    constructor() {
        this.token = localStorage.getItem("token");
        this.userId = sessionStorage.getItem("user_id");
    }

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
            sessionStorage.setItem("user_avatar", user.picture || "/static/images/profile_icon.png");

            const avatar = sessionStorage.getItem("user_avatar");
            const name = sessionStorage.getItem("user_name");

            loginBtn.innerHTML = `<img src="${avatar}" class="user-avatar" /><span>嗨，${name} 👋</span>`;
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

            loginBtn.onclick = () => {
                closeAllModals();
                const loginModal = document.getElementById("loginModal");
                if (loginModal) loginModal.style.display = "flex";
            };

            return false;
        }
    }

    /**
     * 登入成功後上傳占卜紀錄
     */
    async uploadTarotRecord(token, userId) {
        try {
            const savedCards = sessionStorage.getItem("saved_cards");
            const savedSummary = sessionStorage.getItem("saved_summary");
            const savedMusic = sessionStorage.getItem("saved_music");
            const categoryName = sessionStorage.getItem("category_name") || "未分類";
            const subquestionText = sessionStorage.getItem("subquestion_text") || "";

            // 如果有占卜紀錄，就上傳
            if (savedCards || savedSummary || savedMusic) {
                console.log("📤 上傳占卜紀錄...");
                
                // 處理 saved_cards：可能是數字陣列或卡牌物件陣列
                let cardsList = [];
                if (savedCards) {
                    try {
                        const parsed = JSON.parse(savedCards);
                        // 如果是卡牌物件陣列（有 name 和 position）
                        if (Array.isArray(parsed) && parsed[0]?.name) {
                            cardsList = parsed.map(c => ({
                                name: c.name || c.cards_name || "",
                                orientation: c.position || "正位"
                            }));
                        } else {
                            // 如果是數字陣列，保持原樣
                            cardsList = parsed;
                        }
                    } catch (e) {
                        cardsList = [];
                    }
                }

                // 處理 saved_summary：可能是 JSON { html: "..." } 或純字串
                let summaryText = "";
                if (savedSummary) {
                    try {
                        const parsed = JSON.parse(savedSummary);
                        summaryText = parsed.html || parsed || "";
                    } catch (e) {
                        summaryText = savedSummary;
                    }
                }

                // 處理 saved_music：可能是完整的 musicData 物件
                let musicData = null;
                if (savedMusic) {
                    try {
                        musicData = JSON.parse(savedMusic);
                    } catch (e) {
                        musicData = null;
                    }
                }
                
                const uploadData = {
                    user_id: userId,
                    category: categoryName,
                    subquestion: subquestionText,
                    selected_cards: cardsList,
                    summary: summaryText,
                    music: musicData
                };

                console.log("📦 上傳資料:", uploadData);

                const res = await fetch("/api/tarot-records", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(uploadData)
                });

                if (res.ok) {
                    const result = await res.json();
                    console.log("✅ 占卜紀錄已上傳，ID:", result.record_id);
                    // 上傳成功後清除 sessionStorage
                    sessionStorage.removeItem("saved_cards");
                    sessionStorage.removeItem("saved_summary");
                    sessionStorage.removeItem("saved_music");
                    sessionStorage.removeItem("saved_record_sent");
                    return true;
                } else {
                    const errData = await res.json();
                    console.warn("⚠️ 上傳占卜紀錄失敗:", errData.error);
                    return false;
                }
            } else {
                console.log("📭 沒有占卜紀錄需要上傳");
            }
        } catch (err) {
            console.error("❌ 上傳占卜紀錄出錯:", err);
        }
    }

    async login(email, password, nextPath = "/") {
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
                    await this.uploadTarotRecord(data.access_token, meData.user_id);
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

    async register(email, password, name, nextPath = "/") {
        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name })
            });

            const result = await res.json();

            if (res.ok) {
                // 註冊成功後，自動用同一個帳號登入
                return await this.login(email, password, nextPath);
            }

            return { success: false, error: result.error || result.message || "註冊失敗" };
        } catch (err) {
            console.error("註冊錯誤:", err);
            return { success: false, error: "註冊時發生錯誤" };
        }
    }

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

    getToken() {
        return this.token || localStorage.getItem("token");
    }

    getUserId() {
        return this.userId || sessionStorage.getItem("user_id");
    }

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

    setupLoginLogic() {
        const loginModal = document.getElementById("loginModal");
        const closeLogin = document.getElementById("closeLogin");
        const loginForm = document.getElementById("loginForm");
        const googleLoginBtn = document.getElementById("googleLoginBtn");
        const loginError = document.getElementById("loginError");

        if (!loginForm) return;

        if (closeLogin) closeLogin.addEventListener("click", () => {
            loginModal.style.display = "none";
            clearForm(loginForm);
        });

        if (loginModal) {
            window.addEventListener("click", (e) => {
                if (e.target === loginModal) {
                    loginModal.style.display = "none";
                    clearForm(loginForm);
                }
            });
        }

        if (googleLoginBtn) {
            googleLoginBtn.addEventListener("click", () => {
                // ✅ 保存當前頁面路徑
                const currentPath = window.location.pathname + window.location.search;
                sessionStorage.setItem("returnPath", currentPath);
                window.location.href = "/login/google";
            });
        }

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

    setupRegisterLogic() {
        const registerBtn = document.getElementById("register-btn");
        const registerModal = document.getElementById("registerModal");
        const closeRegister = document.getElementById("closeRegister");
        const registerForm = document.getElementById("registerForm");
        const registerMessage = document.getElementById("registerMessage");

        if (!registerForm) return;

        if (registerBtn && registerModal) {
            registerBtn.addEventListener("click", () => {
                closeAllModals();
                registerModal.style.display = "flex";
            });
        }

        if (closeRegister && registerModal) {
            closeRegister.addEventListener("click", () => {
                registerModal.style.display = "none";
                clearForm(registerForm);
            });
        }

        if (registerModal) {
            window.addEventListener("click", (e) => {
                if (e.target === registerModal) {
                    registerModal.style.display = "none";
                    clearForm(registerForm);
                }
            });
        }

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

    setupLogoutLogic() {
        const logoutBtn = document.getElementById("logoutBtn");
        if (!logoutBtn) return;
        logoutBtn.addEventListener("click", async () => {
            await this.logout();
            showAlert("您已成功登出 🌙");
            this.checkLogin();
            const dropdown = document.getElementById("userDropdown");
            if (dropdown) dropdown.style.display = "none";
        });
    }

    setupDropdown() {
        const dropdown = document.getElementById("userDropdown");
        if (!dropdown) return;
        window.addEventListener("click", (e) => {
            if (!e.target.closest("#userDropdown") && !e.target.closest("#login-btn")) {
                dropdown.style.display = "none";
            }
        });
    }

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

        const oldPassword = document.getElementById("oldPassword");
        const newPassword = document.getElementById("newPassword");
        const confirmPassword = document.getElementById("confirmPassword");
        const passwordBtn = accountSettingsModal?.querySelector(".accordion-item:nth-child(3) .btn");

        if (accountSettingsBtn && accountSettingsModal) {
            accountSettingsBtn.addEventListener("click", () => {
                closeAllModals();
                accountSettingsModal.style.display = "flex";
            });
        }

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

        document.querySelectorAll(".accordion-header").forEach(btn => {
            btn.addEventListener("click", () => {
                const content = btn.nextElementSibling;
                const isOpen = content.style.display === "block";
                document.querySelectorAll(".accordion-content").forEach(c => c.style.display = "none");
                content.style.display = isOpen ? "none" : "block";
            });
        });

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
                    : "/static/images/default_avatar.png";
            }
        };
        loadProfile();

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
                    } else {
                        showAlert(data.detail || "更新失敗");
                    }
                } catch (err) {
                    console.error(err);
                    showAlert("更新發生錯誤");
                }
            });
        }

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

        if (passwordBtn) {
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
        }
    }

    setupRecordBtn() {
        const recordBtn = document.getElementById("recordBtn");
        if (recordBtn) recordBtn.addEventListener("click", () => window.location.href = "/records");
    }

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

    if (nameInput) nameInput.value = "";
    if (avatarInput) avatarInput.value = "";
    if (oldPassword) oldPassword.value = "";
    if (newPassword) newPassword.value = "";
    if (confirmPassword) confirmPassword.value = "";
    if (avatarPreview) {
        avatarPreview.src = "/static/images/default_avatar.png";
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