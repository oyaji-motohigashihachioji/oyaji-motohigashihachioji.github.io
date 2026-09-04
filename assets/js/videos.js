import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import { renderVideoCard, wireVideoThumbs } from "./video-card.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("videos");

const list = document.getElementById("videoList");

if (!isFirebaseConfigured) {
  list.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、動画一覧は利用できません。</div>`;
} else {
  loadVideos();
}

async function loadVideos() {
  try {
    const snap = await getDocs(
      query(collection(db, "videos"), where("published", "==", true), orderBy("date", "desc"))
    );
    if (snap.empty) {
      list.innerHTML = `<div class="empty-state">まだ動画がありません。</div>`;
      return;
    }
    list.innerHTML = snap.docs.map((d) => renderVideoCard(d.data())).join("");
    wireVideoThumbs(list);
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
