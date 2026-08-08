import { initSite } from "./site.js";
import {
  watchAuth,
  loginWithGoogle,
  registerWithEmail,
  loginWithEmail,
  resetPassword,
  logout,
  isApproved,
  isAdmin,
  translateAuthError,
  escapeHtml,
} from "./auth-guard.js";
import { isFirebaseConfigured } from "./firebase-init.js";

await initSite("login");

const messageBox = document.getElementById("loginMessage");
const loggedOutView = document.getElementById("loggedOutView");
const loggedInView = document.getElementById("loggedInView");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleRegisterBtn = document.getElementById("googleRegisterBtn");

if (!isFirebaseConfigured) {
  messageBox.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、ログイン機能は現在利用できません。</div>`;
  googleLoginBtn.disabled = true;
  googleRegisterBtn.disabled = true;
} else {
  wireTabs();
  wireGoogleButtons();
  wireEmailLogin();
  wireEmailRegister();
  wireForgotPassword();

  watchAuth((user, profile) => {
    if (!user) {
      loggedOutView.style.display = "block";
      loggedInView.style.display = "none";
      return;
    }
    loggedOutView.style.display = "none";
    loggedInView.style.display = "block";

    const name = escapeHtml(profile?.displayName || user.displayName || "");
    let body;
    if (isAdmin(profile)) {
      body = `
        <div class="alert alert-success">ようこそ、${name} さん（管理者）</div>
        <a href="mypage.html" class="btn btn-dark btn-block" style="margin-bottom:10px;">マイページへ</a>
        <a href="admin.html" class="btn btn-primary btn-block" style="margin-bottom:10px;">管理者ページへ</a>
        <button id="logoutBtn" type="button" class="btn btn-dark btn-block">ログアウト</button>
      `;
    } else if (isApproved(profile)) {
      body = `
        <div class="alert alert-success">ようこそ、${name} さん</div>
        <a href="mypage.html" class="btn btn-primary btn-block" style="margin-bottom:10px;">マイページへ</a>
        <button id="logoutBtn" type="button" class="btn btn-dark btn-block">ログアウト</button>
      `;
    } else {
      body = `
        <div class="alert alert-info">${name} さん、ご登録ありがとうございます。現在、管理者の承認待ちです。承認され次第、マイページがご利用いただけます。</div>
        <button id="logoutBtn" type="button" class="btn btn-dark btn-block">ログアウト</button>
      `;
    }
    loggedInView.innerHTML = body;
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
      await logout();
      location.reload();
    });
  });
}

function wireTabs() {
  const tabs = document.querySelectorAll("#authTabs button");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isLogin = btn.dataset.tab === "login";
      loginTab.style.display = isLogin ? "block" : "none";
      registerTab.style.display = isLogin ? "none" : "block";
    });
  });
}

function wireGoogleButtons() {
  [googleLoginBtn, googleRegisterBtn].forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "処理中…";
      try {
        await loginWithGoogle();
      } catch (e) {
        console.error(e);
        messageBox.innerHTML = `<div class="alert alert-error">ログインに失敗しました: ${escapeHtml(e.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });
}

function wireEmailLogin() {
  const form = document.getElementById("emailLoginForm");
  const msg = document.getElementById("emailLoginMsg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    msg.innerHTML = "";
    try {
      await loginWithEmail(
        document.getElementById("loginEmail").value.trim(),
        document.getElementById("loginPassword").value
      );
    } catch (err) {
      console.error(err);
      msg.innerHTML = `<div class="alert alert-error">${escapeHtml(translateAuthError(err.code))}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}

function wireEmailRegister() {
  const form = document.getElementById("emailRegisterForm");
  const msg = document.getElementById("emailRegisterMsg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regPasswordConfirm").value;
    if (password !== confirm) {
      msg.innerHTML = `<div class="alert alert-error">パスワードが一致しません。</div>`;
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    msg.innerHTML = "";
    try {
      await registerWithEmail(
        document.getElementById("regEmail").value.trim(),
        password,
        document.getElementById("regName").value.trim()
      );
      msg.innerHTML = `<div class="alert alert-success">登録しました。確認メールを送信しましたので、メール内のリンクからメールアドレスの確認をお願いします。</div>`;
    } catch (err) {
      console.error(err);
      msg.innerHTML = `<div class="alert alert-error">${escapeHtml(translateAuthError(err.code))}</div>`;
      btn.disabled = false;
    }
  });
}

function wireForgotPassword() {
  document.getElementById("forgotPasswordLink").addEventListener("click", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("emailLoginMsg");
    const email = document.getElementById("loginEmail").value.trim();
    if (!email) {
      msg.innerHTML = `<div class="alert alert-error">パスワード再設定にはメールアドレスの入力が必要です。</div>`;
      return;
    }
    try {
      await resetPassword(email);
      msg.innerHTML = `<div class="alert alert-success">パスワード再設定用のメールを送信しました。</div>`;
    } catch (err) {
      console.error(err);
      msg.innerHTML = `<div class="alert alert-error">${escapeHtml(translateAuthError(err.code))}</div>`;
    }
  });
}
