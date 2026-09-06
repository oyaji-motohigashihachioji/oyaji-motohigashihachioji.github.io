import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import { renderMarkdown } from "./markdown.js";
import { HISTORY_DEFAULT_BODY } from "./history-default.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("history");

const box = document.getElementById("historyContent");

if (!isFirebaseConfigured) {
  renderContent(HISTORY_DEFAULT_BODY, "");
} else {
  loadHistory();
}

async function loadHistory() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "history"));
    if (!snap.exists() || !snap.data().body) {
      renderContent(HISTORY_DEFAULT_BODY, "");
      return;
    }
    const d = snap.data();
    const updated = d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleDateString("ja-JP") : "";
    renderContent(d.body, updated, d.imageUrl);
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

function renderContent(body, updated, imageUrl) {
  box.innerHTML = `
    ${
      imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="おやじの会の歴史" style="width:100%; border-radius:2px; border:3px solid var(--ink); display:block; margin:0 0 22px;">`
        : ""
    }
    ${updated ? `<div class="meta" style="margin-bottom:14px; text-align:center;">最終更新: ${updated}</div>` : ""}
    <div class="markdown-body" style="line-height:1.9; font-size:15.5px;">${renderMarkdown(body)}</div>
  `;
}
