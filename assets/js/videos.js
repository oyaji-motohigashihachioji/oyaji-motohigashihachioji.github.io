import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
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
    list.innerHTML = snap.docs
      .map((d) => {
        const v = d.data();
        return `
          <article class="video-card">
            <button type="button" class="video-thumb" data-yt="${escapeHtml(v.youtubeId)}" aria-label="動画を再生">
              <img src="https://img.youtube.com/vi/${escapeHtml(v.youtubeId)}/hqdefault.jpg" alt="${escapeHtml(v.title || "")}" loading="lazy">
              <span class="video-play">▶</span>
            </button>
            <div class="video-info">
              ${v.category ? `<span class="chip">${escapeHtml(v.category)}</span>` : ""}
              <h3>${escapeHtml(v.title || "")}</h3>
            </div>
          </article>
        `;
      })
      .join("");

    list.querySelectorAll(".video-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.yt;
        btn.outerHTML = `
          <div class="video-thumb video-thumb-playing">
            <iframe
              src="https://www.youtube.com/embed/${id}?autoplay=1"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        `;
      });
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
