// 動画カードの描画とクリック再生（サムネイル→iframe埋め込み）を
// videos.html とトップページの両方で共有するヘルパー。
import { escapeHtml } from "./auth-guard.js";

export function renderVideoCard(v) {
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
}

export function wireVideoThumbs(container) {
  container.querySelectorAll(".video-thumb").forEach((btn) => {
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
}
