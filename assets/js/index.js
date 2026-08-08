import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import { mountSeasonIcon } from "./season.js";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("index");

mountSeasonIcon("seasonIcon");
document.getElementById("statYears").textContent = new Date().getFullYear() - 2009;

wireGalleryFilter();
if (isFirebaseConfigured) {
  loadDynamicContent();
  renderCategoryTotals();
  loadNextEvent();
  loadPostCount();
  loadChairmanTeaserPhoto();
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
      items.push({ img, tag: p.category || "", cap: p.title || "", id: p.id });
    });
  });
  if (!items.length) return;
  const sizeClasses = ["g-tall", "g-med", "g-short"];
  const masonry = document.getElementById("masonryGrid");
  masonry.innerHTML = items
    .slice(0, 9)
    .map(
      (g, i) => `
      <a class="g-item ${sizeClasses[i % 3]}" data-cat="${escapeHtml(g.tag)}" href="post.html?id=${g.id}">
        <img src="${escapeHtml(g.img)}" alt="${escapeHtml(g.cap)}">
        <span class="g-tag">${escapeHtml(g.tag)}</span>
        <div class="g-cap">${escapeHtml(g.cap)}</div>
      </a>`
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
          <a class="more" href="post.html?id=${p.id}">続きを読む →</a>
        </div>
      </article>`;
    })
    .join("");
}

function renderLedger(posts) {
  // 「直近の記録」は最新12件のサンプルから年別件数を出す簡易表示（正式な合計ではない）
  const cols = document.querySelectorAll(".ledger-col ul");
  if (!cols.length) return;

  const byYear = {};
  posts.forEach((p) => {
    const year = (p.date || "").slice(0, 4);
    if (year) byYear[year] = (byYear[year] || 0) + 1;
  });

  const years = Object.keys(byYear).sort((a, b) => b - a).slice(0, 4);
  if (years.length && cols[0]) {
    cols[0].innerHTML = years
      .map((y) => `<li><a href="archives.html">${y}年</a><b>${byYear[y]}件</b></li>`)
      .join("");
  }
}

// カテゴリー別の正確な合計件数はサンプルではなく都度カウントクエリで取得する
async function renderCategoryTotals() {
  const cols = document.querySelectorAll(".ledger-col ul");
  if (cols.length < 2) return;
  const categories = ["記録", "議事録", "予定"];
  try {
    const counts = await Promise.all(
      categories.map((cat) =>
        getCountFromServer(
          query(collection(db, "posts"), where("published", "==", true), where("category", "==", cat))
        )
      )
    );
    const total = counts.reduce((sum, c) => sum + c.data().count, 0);
    if (total === 0) return; // 未インポート時は静的表示のフォールバックを維持
    cols[1].innerHTML = categories
      .map(
        (c, i) =>
          `<li><a href="archives.html?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a><b>${counts[i].data().count}件</b></li>`
      )
      .join("");
  } catch (e) {
    console.warn("カテゴリー集計の取得に失敗しました:", e);
  }
}

// 直近の「予定」記事のうち、本日以降で最も近いものをトップページに大きく告知する
async function loadNextEvent() {
  try {
    const snap = await getDocs(
      query(
        collection(db, "posts"),
        where("published", "==", true),
        where("category", "==", "予定"),
        orderBy("date", "asc"),
        limit(20)
      )
    );
    if (snap.empty) return;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = snap.docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.date >= today);
    if (!upcoming) return;

    const [y, m, d] = (upcoming.date || "").split("-");
    const dateLabel = y && m && d ? `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日` : "";
    const excerpt = (upcoming.body || "").slice(0, 60) + ((upcoming.body || "").length > 60 ? "…" : "");

    document.getElementById("nextEventDate").textContent = dateLabel;
    document.getElementById("nextEventTitle").textContent = upcoming.title || "";
    document.getElementById("nextEventExcerpt").textContent = excerpt;
    document.getElementById("nextEventLink").href = `post.html?id=${upcoming.id}`;
    document.getElementById("nextEventSection").style.display = "block";
  } catch (e) {
    console.warn("次回イベントの取得に失敗しました:", e);
  }
}

// 会長の写真が登録されていれば、トップページの会長テのアイコンを写真に差し替える
async function loadChairmanTeaserPhoto() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "chairmanMessage"));
    const imageUrl = snap.exists() ? snap.data().imageUrl : "";
    if (!imageUrl) return;
    const el = document.getElementById("chairmanTeaserIcon");
    if (!el) return;
    el.outerHTML = `<img src="${escapeHtml(imageUrl)}" alt="会長" style="width:56px; height:56px; border-radius:50%; object-fit:cover; border:3px solid var(--ink); flex-shrink:0;">`;
  } catch (e) {
    console.warn("会長の写真の取得に失敗しました:", e);
  }
}

// 「活動記録数」の正確な合計をstat-stripに表示する
async function loadPostCount() {
  try {
    const snap = await getCountFromServer(query(collection(db, "posts"), where("published", "==", true)));
    const el = document.getElementById("statPosts");
    if (el) el.textContent = `${snap.data().count}件`;
  } catch (e) {
    console.warn("活動記録数の取得に失敗しました:", e);
  }
}
