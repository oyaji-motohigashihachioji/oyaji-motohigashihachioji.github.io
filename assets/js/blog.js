import { initSite } from "./site.js";
import { watchAuth, isApproved, isAdmin, escapeHtml } from "./auth-guard.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { convertDriveLink } from "./drive-link.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("blog");

const params = new URLSearchParams(location.search);
const viewId = params.get("id");
const editId = params.get("edit");
const PAGE_SIZE = 6;

const listWrap = document.getElementById("blogListWrap");
const detailWrap = document.getElementById("blogDetailWrap");
const writeWrap = document.getElementById("blogWriteWrap");
const newPostBtn = document.getElementById("newPostBtn");
const blogList = document.getElementById("blogList");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const form = document.getElementById("blogForm");
const cancelBtn = document.getElementById("blogCancelBtn");

let currentUser = null;
let currentProfile = null;
let lastDoc = null;

if (!isFirebaseConfigured) {
  blogList.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、ブログは利用できません。</div>`;
} else {
  watchAuth((user, profile) => {
    currentUser = user;
    currentProfile = profile;
    newPostBtn.style.display = isApproved(profile) ? "inline-flex" : "none";

    if (editId) {
      openEditForm(editId);
    } else if (viewId) {
      showDetail(viewId);
    } else {
      showList();
    }
  });

  newPostBtn.addEventListener("click", () => {
    if (!currentUser) {
      location.href = "login.html";
      return;
    }
    if (!isApproved(currentProfile)) {
      alert("会員承認後にブログ投稿ができます。");
      return;
    }
    openNewForm();
  });

  cancelBtn.addEventListener("click", closeWriteForm);

  loadMoreBtn.addEventListener("click", () => loadListPage(true));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("blogPostId").value;
    const data = {
      title: document.getElementById("blogTitle").value.trim(),
      body: document.getElementById("blogBody").value.trim(),
      image: convertDriveLink(document.getElementById("blogImage").value.trim()),
    };
    try {
      if (id) {
        await updateDoc(doc(db, "blogPosts", id), data);
      } else {
        await addDoc(collection(db, "blogPosts"), {
          ...data,
          authorUid: currentUser.uid,
          authorName: currentProfile?.displayName || currentUser.displayName || "会員",
          published: true,
          createdAt: serverTimestamp(),
        });
      }
      location.href = id ? `blog.html?id=${id}` : "blog.html";
    } catch (err) {
      console.error(err);
      document.getElementById("blogFormMsg").innerHTML =
        `<div class="alert alert-error">保存に失敗しました: ${escapeHtml(err.message)}</div>`;
    }
  });
}

function openNewForm() {
  form.reset();
  document.getElementById("blogPostId").value = "";
  document.getElementById("blogFormTitle").textContent = "新規ブログ投稿";
  detailWrap.style.display = "none";
  listWrap.style.display = "none";
  writeWrap.style.display = "block";
  writeWrap.scrollIntoView({ behavior: "smooth" });
}

async function openEditForm(id) {
  const snap = await getDoc(doc(db, "blogPosts", id));
  if (!snap.exists()) {
    blogList.innerHTML = `<div class="empty-state">投稿が見つかりませんでした。</div>`;
    return;
  }
  const p = snap.data();
  const canEdit = currentUser && (currentUser.uid === p.authorUid || isAdmin(currentProfile));
  if (!canEdit) {
    location.href = `blog.html?id=${id}`;
    return;
  }
  document.getElementById("blogPostId").value = id;
  document.getElementById("blogTitle").value = p.title || "";
  document.getElementById("blogBody").value = p.body || "";
  document.getElementById("blogImage").value = p.image || "";
  document.getElementById("blogFormTitle").textContent = "投稿を編集";
  listWrap.style.display = "none";
  detailWrap.style.display = "none";
  writeWrap.style.display = "block";
}

function closeWriteForm() {
  writeWrap.style.display = "none";
  listWrap.style.display = "block";
  history.replaceState(null, "", "blog.html");
}

async function showDetail(id) {
  listWrap.style.display = "none";
  writeWrap.style.display = "none";
  detailWrap.style.display = "block";
  detailWrap.innerHTML = `<div class="empty-state">読み込み中…</div>`;
  try {
    const snap = await getDoc(doc(db, "blogPosts", id));
    if (!snap.exists()) {
      detailWrap.innerHTML = `<div class="empty-state">投稿が見つかりませんでした。<br><a href="blog.html" style="color:var(--red); font-weight:700;">一覧へ戻る</a></div>`;
      return;
    }
    const p = snap.data();
    const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("ja-JP") : "";
    const canEdit = currentUser && (currentUser.uid === p.authorUid || isAdmin(currentProfile));
    detailWrap.innerHTML = `
      <div class="form-card" style="max-width:760px; margin:0 auto;">
        <div class="meta">${escapeHtml(p.authorName || "")} ・ ${date}</div>
        <h1 style="margin:6px 0 22px; font-size:clamp(24px,3.4vw,34px);">${escapeHtml(p.title)}</h1>
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" style="width:100%; border:3px solid var(--ink); border-radius:2px; margin-bottom:22px;">` : ""}
        <div style="white-space:pre-wrap; line-height:1.9; font-size:15px;">${escapeHtml(p.body)}</div>
        <div class="row-actions" style="margin-top:28px;">
          ${canEdit ? `<a href="blog.html?edit=${id}" class="btn btn-dark">編集する</a>` : ""}
          ${canEdit ? `<button type="button" id="deleteDetailBtn" class="btn btn-ghost" style="border-color:var(--red); color:var(--red);">削除する</button>` : ""}
          <a href="blog.html" class="btn btn-ghost" style="border-color:var(--ink); color:var(--ink);">一覧へ戻る</a>
        </div>
      </div>
    `;
    document.getElementById("deleteDetailBtn")?.addEventListener("click", async () => {
      if (!confirm("この投稿を削除しますか？")) return;
      await deleteDoc(doc(db, "blogPosts", id));
      location.href = "blog.html";
    });
  } catch (e) {
    console.error(e);
    detailWrap.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

async function showList() {
  writeWrap.style.display = "none";
  detailWrap.style.display = "none";
  listWrap.style.display = "block";
  blogList.innerHTML = `<div class="empty-state">読み込み中…</div>`;
  lastDoc = null;
  await loadListPage(false);
}

async function loadListPage(append) {
  try {
    let q = query(
      collection(db, "blogPosts"),
      where("published", "==", true),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    if (append && lastDoc) {
      q = query(
        collection(db, "blogPosts"),
        where("published", "==", true),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
    }
    const snap = await getDocs(q);
    if (!append) blogList.innerHTML = "";
    if (snap.empty && !append) {
      blogList.innerHTML = `<div class="empty-state">まだ投稿がありません。最初のブログを書いてみませんか？</div>`;
      loadMoreWrap.style.display = "none";
      return;
    }
    lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
    blogList.insertAdjacentHTML("beforeend", snap.docs.map(renderCard).join(""));
    loadMoreWrap.style.display = snap.docs.length === PAGE_SIZE ? "block" : "none";
  } catch (e) {
    console.error(e);
    blogList.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
    loadMoreWrap.style.display = "none";
  }
}

function renderCard(d) {
  const p = d.data();
  const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("ja-JP") : "";
  const excerpt = (p.body || "").slice(0, 70) + ((p.body || "").length > 70 ? "…" : "");
  return `
    <article class="card">
      <div class="thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : ""}</div>
      <div class="body">
        <span class="chip">ブログ</span>
        <div class="meta">${escapeHtml(p.authorName || "")} ・ ${date}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(excerpt)}</p>
        <a class="more" href="blog.html?id=${d.id}">続きを読む →</a>
      </div>
    </article>
  `;
}
