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
        sessionStorage.removeItem("next");


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
            const loginModal = document.getElementById("loginModal");
            if (loginModal) loginModal.style.display = "flex";
      };

        return false;
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

        const returnPath = sessionStorage.getItem("returnPath");
        if (returnPath) {
            sessionStorage.removeItem("returnPath");
            window.location.href = returnPath; // ✅ 回到原頁面
        } else {
            window.location.href = "/";
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
            body: JSON.stringify({ email, password, name})
      });

    const result = await res.json();

    if (res.ok) {
        localStorage.setItem("token", result.access_token);
        this.token = result.access_token;

        const returnPath = sessionStorage.getItem("returnPath");
        if (returnPath) {
            sessionStorage.removeItem("returnPath");
            window.location.href = returnPath; // ✅ 回到原頁面
        } else {
            window.location.href = "/";
        }

        return { success: true };
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
    this.checkLogin();
  }

setupLoginLogic() {
    const loginModal = document.getElementById("loginModal");
    const closeLogin = document.getElementById("closeLogin");
    const loginForm = document.getElementById("loginForm");
    const googleLoginBtn = document.getElementById("googleLoginBtn");

    if (!loginForm) return;

    if (closeLogin) closeLogin.addEventListener("click", () => loginModal.style.display = "none");

    if (loginModal) {
        window.addEventListener("click", (e) => {
            if (e.target === loginModal) loginModal.style.display = "none";
      });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", () => {
        const returnPath = window.location.pathname + window.location.search;
        sessionStorage.setItem("returnPath", returnPath); // ✅ 加這行
        window.location.href = "/login/google";
  });
}

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const loginError = document.getElementById("loginError");
        const currentPath = window.location.pathname;

    try {
        const result = await this.login(email, password, currentPath);

        if (result.success) {
            loginForm.reset();
            if (loginError) loginError.style.display = "none";
            showAlert("登入成功 🌟");
            if (loginModal) loginModal.style.display = "none";
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
    


    if (!registerForm) return;

    if (registerBtn && registerModal) registerBtn.addEventListener("click", () => registerModal.style.display = "flex");
    if (closeRegister && registerModal) closeRegister.addEventListener("click", () => registerModal.style.display = "none");

    if (registerModal) {
      window.addEventListener("click", (e) => {
        if (e.target === registerModal) registerModal.style.display = "none";
      });
    }

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      const name = document.getElementById("registerName").value;
      const registerMessage = document.getElementById("registerMessage");

      try {
        const result = await this.register(email, password, name);
        if (registerMessage) {
          registerMessage.textContent = result.error || "註冊成功，請查看 Email";
          registerMessage.style.color = result.success ? "green" : "red";
        }
        if (result.success) {
          registerForm.reset();
          showAlert("註冊成功 ✅，請查看 Email！");
          setTimeout(() => { if (registerModal) registerModal.style.display = "none"; }, 1500);
        }
      } catch (err) {
        console.error(err);
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
    const contactBtn = document.getElementById("contactBtn");
    const contactModal = document.getElementById("contactModal");
    const closeContact = document.getElementById("closeContact");

    if (accountSettingsBtn && accountSettingsModal) accountSettingsBtn.addEventListener("click", () => accountSettingsModal.style.display = "flex");
    if (closeAccountSettings && accountSettingsModal) closeAccountSettings.addEventListener("click", () => accountSettingsModal.style.display = "none");
    if (contactBtn && contactModal) contactBtn.addEventListener("click", () => contactModal.style.display = "flex");
    if (closeContact && contactModal) closeContact.addEventListener("click", () => contactModal.style.display = "none");

    document.querySelectorAll(".accordion-header").forEach(btn => {
      btn.addEventListener("click", () => {
        const content = btn.nextElementSibling;
        const isOpen = content.style.display === "block";
        document.querySelectorAll(".accordion-content").forEach(c => c.style.display = "none");
        content.style.display = isOpen ? "none" : "block";
      });
    });
  }

  setupRecordBtn() {
    const recordBtn = document.getElementById("recordBtn");
    if (recordBtn) recordBtn.addEventListener("click", () => window.location.href = "/records");
  }
}

// 全域實例
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


// 初始化
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Global JS 已加載");
    globalAuth.init();
});
