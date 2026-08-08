import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
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
      ${updated ? `<div class="meta" style="margin-bottom:14px;">最終更新: ${updated}</div>` : ""}
      <div style="white-space:pre-wrap; line-height:1.9; font-size:15.5px;">${escapeHtml(d.body)}</div>
    `;
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
