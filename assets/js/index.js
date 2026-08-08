import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("index");

wireGalleryFilter();
if (isFirebaseConfigured) {
  loadDynamicContent();
}

function wireGalleryFilter() {
  const tabs = document.querySelectorAll("#galleryFilterTabs button");
  const items = () => document.querySelectorAll("#masonryGrid .g-item");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      items().forEach((item) => {
        const show = filter === "すべて" || item.dataset.cat === filter;
        item.style.display = show ? "" : "none";
      });
    });
  });
}

// Firestoreに公開済みの活動記録があれば、静的なサンプルコンテンツを実データで置き換える。
// 取得できない/空の場合は既存の静的マークアップをそのまま表示する（フォールバック）。
async function loadDynamicContent() {
  try {
    const snap = await getDocs(
      query(collection(db, "posts"), where("published", "==", true), orderBy("date", "desc"), limit(12))
    );
    if (snap.empty) return;
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    renderGallery(posts);
    renderActivityCards(posts);
    renderLedger(posts);
  } catch (e) {
    console.warn("動的コンテンツの読み込みに失敗したため、静的表示を維持します:", e);
  }
}

function renderGallery(posts) {
  const items = [];
  posts.forEach((p) => {
    (p.images || []).forEach((img) => {
      items.push({ img, tag: p.category || "", cap: p.title || "" });
    });
  });
  if (!items.length) return;
  const sizeClasses = ["g-tall", "g-med", "g-short"];
  const masonry = document.getElementById("masonryGrid");
  masonry.innerHTML = items
    .slice(0, 9)
    .map(
      (g, i) => `
      <div class="g-item ${sizeClasses[i % 3]}" data-cat="${escapeHtml(g.tag)}">
        <img src="${escapeHtml(g.img)}" alt="${escapeHtml(g.cap)}">
        <span class="g-tag">${escapeHtml(g.tag)}</span>
        <div class="g-cap">${escapeHtml(g.cap)}</div>
      </div>`
    )
    .join("");
}

function renderActivityCards(posts) {
  const grid = document.getElementById("activityCardGrid");
  if (!posts.length) return;
  grid.innerHTML = posts
    .slice(0, 3)
    .map((p) => {
      const [y, m, d] = (p.date || "").split("-");
      const thumb = (p.images || [])[0] || "";
      const excerpt = (p.body || "").slice(0, 46) + ((p.body || "").length > 46 ? "…" : "");
      return `<article class="card">
        <div class="thumb">
          ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.title)}">` : ""}
          <div class="stamp"><span class="y">${escapeHtml(y || "")}</span><span class="md">${m && d ? `${parseInt(m, 10)}.${parseInt(d, 10)}` : ""}</span></div>
        </div>
        <div class="body">
          <span class="chip">${escapeHtml(p.category || "記録")}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(excerpt)}</p>
          <a class="more" href="#">続きを読む →</a>
        </div>
      </article>`;
    })
    .join("");
}

function renderLedger(posts) {
  const cols = document.querySelectorAll(".ledger-col ul");
  if (!cols.length) return;

  const byYear = {};
  const byCategory = {};
  posts.forEach((p) => {
    const year = (p.date || "").slice(0, 4);
    if (year) byYear[year] = (byYear[year] || 0) + 1;
    const cat = p.category || "記録";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  const years = Object.keys(byYear).sort((a, b) => b - a).slice(0, 4);
  if (years.length && cols[0]) {
    cols[0].innerHTML = years.map((y) => `<li>${y}年<b>${byYear[y]}件</b></li>`).join("");
  }

  const cats = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]).slice(0, 4);
  if (cats.length && cols[1]) {
    cols[1].innerHTML = cats.map((c) => `<li>${escapeHtml(c)}<b>${byCategory[c]}件</b></li>`).join("");
  }
}
