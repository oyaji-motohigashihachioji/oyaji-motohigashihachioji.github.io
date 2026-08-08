import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("gallery");

const detail = document.getElementById("postDetail");
const params = new URLSearchParams(location.search);
const id = params.get("id");

if (!isFirebaseConfigured) {
  detail.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、この記事は表示できません。</div>`;
} else if (!id) {
  detail.innerHTML = `<div class="empty-state">記事が指定されていません。<br><a href="index.html#gallery" style="color:var(--red); font-weight:700;">活動記録一覧へ →</a></div>`;
} else {
  loadPost(id);
}

async function loadPost(postId) {
  try {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists() || snap.data().published !== true) {
      detail.innerHTML = `<div class="empty-state">記事が見つかりませんでした。<br><a href="index.html#gallery" style="color:var(--red); font-weight:700;">活動記録一覧へ →</a></div>`;
      return;
    }
    const p = snap.data();
    const [y, m, d] = (p.date || "").split("-");
    const dateLabel = y && m && d ? `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日` : "";
    const images = Array.isArray(p.images) ? p.images : [];

    detail.innerHTML = `
      <div class="form-card">
        <span class="chip">${escapeHtml(p.category || "記録")}</span>
        <div class="meta" style="margin-top:8px;">${dateLabel}</div>
        <h1 style="margin:8px 0 22px; font-size:clamp(24px,3.4vw,34px);">${escapeHtml(p.title)}</h1>
        ${
          images.length
            ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; margin-bottom:24px;">
                ${images
                  .map(
                    (src) =>
                      `<img src="${escapeHtml(src)}" alt="" loading="lazy" style="width:100%; aspect-ratio:4/3; object-fit:cover; border:2px solid var(--ink); border-radius:2px;">`
                  )
                  .join("")}
              </div>`
            : ""
        }
        <div style="white-space:pre-wrap; line-height:1.9; font-size:15px;">${escapeHtml(p.body)}</div>
        <div class="row-actions" style="margin-top:28px;">
          <a href="index.html#gallery" class="btn btn-ghost" style="border-color:var(--ink); color:var(--ink);">活動記録一覧へ戻る</a>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
    if (e.code === "permission-denied") {
      // 未公開/存在しない記事はセキュリティルール上 permission-denied として返る
      detail.innerHTML = `<div class="empty-state">記事が見つかりませんでした。<br><a href="index.html#gallery" style="color:var(--red); font-weight:700;">活動記録一覧へ →</a></div>`;
    } else {
      detail.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
    }
  }
}
