// 全ページ共通の初期化: ヘッダー/フッター読み込み → 認証ナビ描画 → 訪問者カウント。
// 各ページのモジュールスクリプトは最初に `await initSite('pagename')` を呼び、
// その戻り値（Promiseが解決した後）で本文固有の初期化を行う。
import { loadPartials } from "./partials.js";
import { initAuthNav } from "./auth-guard.js";
import { trackVisit, renderVisitorCount } from "./visitor-tracker.js";
import { isFirebaseConfigured } from "./firebase-init.js";

export async function initSite(activePage) {
  await loadPartials(activePage);
  initAuthNav();
  renderVisitorCount();
  trackVisit();
  if (!isFirebaseConfigured) {
    showFirebaseNotice();
  }
}

// Firebase未設定時に、ページ上部へ静かな案内バナーを1つだけ表示する。
function showFirebaseNotice() {
  if (document.getElementById("fbNoticeBanner")) return;
  const header = document.querySelector("header");
  if (!header) return;
  const bar = document.createElement("div");
  bar.id = "fbNoticeBanner";
  bar.style.cssText =
    "background:#f8d7d0;color:#BE3A26;font-size:12.5px;font-weight:700;text-align:center;padding:8px 12px;";
  bar.textContent =
    "Firebase未設定のため、ログイン・投稿・DB連携機能は現在利用できません（表示のみ）。管理者は assets/js/firebase-config.js を設定してください。";
  header.after(bar);
}
