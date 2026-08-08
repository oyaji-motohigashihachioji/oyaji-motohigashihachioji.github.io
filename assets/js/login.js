import { initSite } from "./site.js";
import { watchAuth, loginWithGoogle, logout, isApproved, isAdmin, escapeHtml } from "./auth-guard.js";
import { isFirebaseConfigured } from "./firebase-init.js";

await initSite("login");

const messageBox = document.getElementById("loginMessage");
const loggedOutView = document.getElementById("loggedOutView");
const loggedInView = document.getElementById("loggedInView");
const googleLoginBtn = document.getElementById("googleLoginBtn");

if (!isFirebaseConfigured) {
  messageBox.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、ログイン機能は現在利用できません。</div>`;
  googleLoginBtn.disabled = true;
} else {
  googleLoginBtn.addEventListener("click", async () => {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = "ログイン中…";
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
      messageBox.innerHTML = `<div class="alert alert-error">ログインに失敗しました: ${escapeHtml(e.message)}</div>`;
      googleLoginBtn.disabled = false;
      googleLoginBtn.textContent = "Googleでログイン / 新規登録";
    }
  });

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
