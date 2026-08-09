import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import { renderMarkdown } from "./markdown.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("chairman");

const box = document.getElementById("chairmanContent");

if (!isFirebaseConfigured) {
  box.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、表示できません。</div>`;
} else {
  loadMessage();
}

async function loadMessage() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "chairmanMessage"));
    if (!snap.exists() || !snap.data().body) {
      box.innerHTML = `<div class="empty-state">まだ会長からのメッセージは登録されていません。</div>`;
      return;
    }
    const d = snap.data();
    const updated = d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleDateString("ja-JP") : "";
    box.innerHTML = `
      ${
        d.imageUrl
          ? `<img src="${escapeHtml(d.imageUrl)}" alt="会長" style="width:150px; height:150px; border-radius:50%; object-fit:cover; border:4px solid var(--ink); display:block; margin:0 auto 22px;">`
          : ""
      }
      ${updated ? `<div class="meta" style="margin-bottom:14px; text-align:center;">最終更新: ${updated}</div>` : ""}
      <div class="markdown-body" style="line-height:1.9; font-size:15.5px;">${renderMarkdown(d.body)}</div>
    `;
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
