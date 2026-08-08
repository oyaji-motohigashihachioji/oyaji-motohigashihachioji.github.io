import { initSite } from "./site.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { escapeHtml } from "./auth-guard.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("archives");

const PAGE_SIZE = 12;
const CATEGORIES = ["すべて", "記録", "予定", "議事録"];

const list = document.getElementById("archiveList");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const tabs = document.querySelectorAll("#archiveTabs button");

let lastDoc = null;
const params = new URLSearchParams(location.search);
let currentCategory = CATEGORIES.includes(params.get("category")) ? params.get("category") : "すべて";

if (!isFirebaseConfigured) {
  list.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、アーカイブは利用できません。</div>`;
} else {
  tabs.forEach((btn) => {
    if (btn.dataset.cat === currentCategory) btn.classList.add("active");
    else btn.classList.remove("active");
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      const url = new URL(location.href);
      if (currentCategory === "すべて") url.searchParams.delete("category");
      else url.searchParams.set("category", currentCategory);
      history.replaceState(null, "", url);
      lastDoc = null;
      loadPage(false);
    });
  });
  loadMoreBtn.addEventListener("click", () => loadPage(true));
  loadPage(false);
}

async function loadPage(append) {
  try {
    const filters = [where("published", "==", true)];
    if (currentCategory !== "すべて") filters.push(where("category", "==", currentCategory));
    const baseArgs = [collection(db, "posts"), ...filters, orderBy("date", "desc")];
    const q =
      append && lastDoc
        ? query(...baseArgs, startAfter(lastDoc), limit(PAGE_SIZE))
        : query(...baseArgs, limit(PAGE_SIZE));

    const snap = await getDocs(q);
    if (!append) list.innerHTML = "";
    if (snap.empty && !append) {
      list.innerHTML = `<div class="empty-state">この条件の記事はまだありません。</div>`;
      loadMoreWrap.style.display = "none";
      return;
    }
    lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
    list.insertAdjacentHTML("beforeend", snap.docs.map(renderCard).join(""));
    loadMoreWrap.style.display = snap.docs.length === PAGE_SIZE ? "block" : "none";
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
    loadMoreWrap.style.display = "none";
  }
}

function renderCard(d) {
  const p = d.data();
  const [y, m, dd] = (p.date || "").split("-");
  const thumb = (p.images || [])[0] || "";
  const excerpt = (p.body || "").slice(0, 60) + ((p.body || "").length > 60 ? "…" : "");
  return `
    <article class="card">
      <div class="thumb">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.title)}">` : ""}
        <div class="stamp"><span class="y">${escapeHtml(y || "")}</span><span class="md">${m && dd ? `${parseInt(m, 10)}.${parseInt(dd, 10)}` : ""}</span></div>
      </div>
      <div class="body">
        <span class="chip">${escapeHtml(p.category || "記録")}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(excerpt)}</p>
        <a class="more" href="post.html?id=${d.id}">続きを読む →</a>
      </div>
    </article>
  `;
}
