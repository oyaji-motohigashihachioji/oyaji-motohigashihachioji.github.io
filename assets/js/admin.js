import { initSite } from "./site.js";
import { watchAuth, isAdmin, escapeHtml } from "./auth-guard.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { convertDriveLink } from "./drive-link.js";
import { HISTORY_DEFAULT_BODY } from "./history-default.js";
import { extractYoutubeId } from "./youtube-link.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("admin");

const gate = document.getElementById("adminGate");
const app = document.getElementById("adminApp");

const POSITIONS = ["会長", "副会長", "会計", "書記", "理事", "一般会員"];

if (!isFirebaseConfigured) {
  gate.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、管理者ページは利用できません。</div>`;
} else {
  watchAuth((user, profile) => {
    if (!user) {
      location.href = "login.html";
      return;
    }
    if (!isAdmin(profile)) {
      gate.innerHTML = `<div class="alert alert-error">このページは管理者のみ閲覧できます。</div>`;
      return;
    }
    gate.style.display = "none";
    app.style.display = "block";
    initTabs();
    loadMembers();
    loadPosts();
    loadBlogPosts();
    loadStats();
    wirePostForm();
    wireLegacyImport();
    wireChairmanForm();
    wireBannerForm();
    wireHistoryForm();
    wireVideoForm();
    loadVideos();
  });
}

function initTabs() {
  const tabs = document.querySelectorAll("#adminTabs button");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

/* ---------------- 会員管理 ---------------- */
async function loadMembers() {
  const wrap = document.getElementById("membersTableWrap");
  try {
    const snap = await getDocs(query(collection(db, "users"), orderBy("joinedAt", "desc")));
    if (snap.empty) {
      wrap.innerHTML = `<div class="empty-state">会員がまだいません。</div>`;
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th></th><th>名前</th><th>メール</th><th>状態</th><th>権限</th><th>役職</th><th>操作</th></tr></thead>
      <tbody>${snap.docs
        .map((d) => {
          const m = d.data();
          const joined = m.joinedAt?.toDate ? m.joinedAt.toDate().toLocaleDateString("ja-JP") : "-";
          return `<tr data-uid="${d.id}">
            <td>${m.photoURL ? `<img class="avatar" src="${escapeHtml(m.photoURL)}" alt="">` : ""}</td>
            <td>${escapeHtml(m.displayName)}<div class="hint">${joined} 登録</div></td>
            <td>${escapeHtml(m.email)}</td>
            <td>${m.status === "approved" ? '<span class="badge badge-approved">承認済</span>' : '<span class="badge badge-pending">承認待ち</span>'}</td>
            <td>
              <select data-role>
                <option value="member" ${m.role === "member" ? "selected" : ""}>会員</option>
                <option value="admin" ${m.role === "admin" ? "selected" : ""}>管理者</option>
              </select>
            </td>
            <td>
              <select data-position>
                ${POSITIONS.map((p) => `<option value="${p}" ${m.position === p ? "selected" : ""}>${p}</option>`).join("")}
              </select>
            </td>
            <td class="row-actions">
              ${m.status !== "approved" ? '<button type="button" class="link-btn" data-approve>承認</button>' : ""}
              <button type="button" class="link-btn" data-save>保存</button>
              <button type="button" class="link-btn" data-remove>削除</button>
            </td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>`;

    wrap.querySelectorAll("tr[data-uid]").forEach((row) => {
      const uid = row.dataset.uid;
      row.querySelector("[data-approve]")?.addEventListener("click", async () => {
        await updateDoc(doc(db, "users", uid), { status: "approved" });
        loadMembers();
      });
      row.querySelector("[data-save]").addEventListener("click", async () => {
        const role = row.querySelector("[data-role]").value;
        const position = row.querySelector("[data-position]").value;
        try {
          await updateDoc(doc(db, "users", uid), { role, position });
          showMsg("membersMsg", "success", "会員情報を更新しました。");
        } catch (e) {
          showMsg("membersMsg", "error", `更新に失敗しました: ${e.message}`);
        }
      });
      row.querySelector("[data-remove]").addEventListener("click", async () => {
        if (!confirm("この会員を削除しますか？（ログイン自体は取り消せません）")) return;
        await deleteDoc(doc(db, "users", uid));
        loadMembers();
      });
    });
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="alert alert-error">会員一覧の読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

function showMsg(elId, type, text) {
  const el = document.getElementById(elId);
  el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(text)}</div>`;
  setTimeout(() => {
    if (el.innerHTML.includes(escapeHtml(text))) el.innerHTML = "";
  }, 4000);
}

/* ---------------- 旧サイト過去記事インポート ---------------- */
function wireLegacyImport() {
  const btn = document.getElementById("importLegacyBtn");
  btn.addEventListener("click", async () => {
    if (!confirm("旧サイトの過去記事156件をFirestoreにインポートします。よろしいですか？")) return;
    btn.disabled = true;
    btn.textContent = "インポート中…";
    try {
      const [existingSnap, legacyPosts] = await Promise.all([
        getDocs(collection(db, "posts")),
        fetch("assets/data/legacy-posts.json").then((r) => r.json()),
      ]);
      const existingLegacyIds = new Set(
        existingSnap.docs.map((d) => d.data().legacyId).filter(Boolean)
      );
      const toImport = legacyPosts.filter((p) => !existingLegacyIds.has(p.id));

      if (toImport.length === 0) {
        showMsg("importMsg", "info", "インポート済みです。新規に追加できる記事はありません。");
        return;
      }

      // Firestore の writeBatch は1回あたり最大500件まで
      const chunkSize = 450;
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const batch = writeBatch(db);
        toImport.slice(i, i + chunkSize).forEach((p) => {
          const ref = doc(collection(db, "posts"));
          batch.set(ref, {
            title: p.title,
            body: p.bodyText,
            category: p.category,
            date: p.date,
            images: p.images || [],
            published: true,
            legacyId: p.id,
            createdAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      showMsg("importMsg", "success", `${toImport.length}件の過去記事をインポートしました。`);
      loadPosts();
    } catch (e) {
      console.error(e);
      showMsg("importMsg", "error", `インポートに失敗しました: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "過去記事156件をインポートする";
    }
  });
}

/* ---------------- 活動記録投稿 ---------------- */
function wirePostForm() {
  const form = document.getElementById("postForm");
  const cancelBtn = document.getElementById("postCancelEdit");
  const title = document.getElementById("postFormTitle");

  cancelBtn.addEventListener("click", () => resetPostForm());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("postId").value;
    const images = document
      .getElementById("postImages")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(convertDriveLink);

    const data = {
      title: document.getElementById("postTitle").value.trim(),
      category: document.getElementById("postCategory").value.trim(),
      date: document.getElementById("postDate").value,
      published: document.getElementById("postPublished").value === "true",
      body: document.getElementById("postBody").value.trim(),
      images,
    };

    try {
      if (id) {
        await updateDoc(doc(db, "posts", id), data);
      } else {
        await addDoc(collection(db, "posts"), { ...data, createdAt: serverTimestamp() });
      }
      showMsg("postFormMsg", "success", "保存しました。");
      resetPostForm();
      loadPosts();
    } catch (e) {
      console.error(e);
      showMsg("postFormMsg", "error", `保存に失敗しました: ${e.message}`);
    }
  });

  function resetPostForm() {
    form.reset();
    document.getElementById("postId").value = "";
    title.textContent = "新規活動記録を投稿";
    cancelBtn.style.display = "none";
  }
}

async function loadPosts() {
  const wrap = document.getElementById("postsTableWrap");
  try {
    const snap = await getDocs(query(collection(db, "posts"), orderBy("date", "desc")));
    if (snap.empty) {
      wrap.innerHTML = `<div class="empty-state">投稿がまだありません。</div>`;
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>日付</th><th>タイトル</th><th>カテゴリー</th><th>状態</th><th>操作</th></tr></thead>
      <tbody>${snap.docs
        .map((d) => {
          const p = d.data();
          return `<tr>
            <td>${escapeHtml(p.date)}</td>
            <td>${escapeHtml(p.title)}</td>
            <td>${escapeHtml(p.category)}</td>
            <td>${p.published ? '<span class="badge badge-approved">公開</span>' : '<span class="badge badge-pending">下書き</span>'}</td>
            <td class="row-actions">
              <button type="button" class="link-btn" data-edit="${d.id}">編集</button>
              <button type="button" class="link-btn" data-delete="${d.id}">削除</button>
            </td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "posts", btn.dataset.edit));
        if (!snap2.exists()) return;
        const p = snap2.data();
        document.getElementById("postId").value = snap2.id;
        document.getElementById("postTitle").value = p.title || "";
        document.getElementById("postCategory").value = p.category || "";
        document.getElementById("postDate").value = p.date || "";
        document.getElementById("postPublished").value = String(!!p.published);
        document.getElementById("postBody").value = p.body || "";
        document.getElementById("postImages").value = (p.images || []).join("\n");
        document.getElementById("postFormTitle").textContent = "活動記録を編集";
        document.getElementById("postCancelEdit").style.display = "inline-flex";
        document.querySelector('#adminTabs button[data-tab="posts"]').click();
        document.getElementById("postForm").scrollIntoView({ behavior: "smooth" });
      });
    });
    wrap.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("この活動記録を削除しますか？")) return;
        await deleteDoc(doc(db, "posts", btn.dataset.delete));
        loadPosts();
      });
    });
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

/* ---------------- ブログ管理 ---------------- */
async function loadBlogPosts() {
  const wrap = document.getElementById("blogTableWrap");
  try {
    const snap = await getDocs(query(collection(db, "blogPosts"), orderBy("createdAt", "desc")));
    if (snap.empty) {
      wrap.innerHTML = `<div class="empty-state">ブログ投稿がまだありません。</div>`;
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>タイトル</th><th>投稿者</th><th>投稿日</th><th>状態</th><th>操作</th></tr></thead>
      <tbody>${snap.docs
        .map((d) => {
          const p = d.data();
          const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("ja-JP") : "-";
          return `<tr>
            <td><a href="blog.html?id=${d.id}" target="_blank" style="color:var(--red); font-weight:700;">${escapeHtml(p.title)}</a></td>
            <td>${escapeHtml(p.authorName || "")}</td>
            <td>${date}</td>
            <td>${p.published ? '<span class="badge badge-approved">公開中</span>' : '<span class="badge badge-pending">非公開</span>'}</td>
            <td class="row-actions">
              <button type="button" class="link-btn" data-toggle="${d.id}" data-current="${!!p.published}">${p.published ? "非公開にする" : "公開にする"}</button>
              <button type="button" class="link-btn" data-delete="${d.id}">削除</button>
            </td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>`;

    wrap.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.dataset.current !== "true";
        await updateDoc(doc(db, "blogPosts", btn.dataset.toggle), { published: next });
        loadBlogPosts();
      });
    });
    wrap.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("この投稿を削除しますか？")) return;
        await deleteDoc(doc(db, "blogPosts", btn.dataset.delete));
        loadBlogPosts();
      });
    });
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

/* ---------------- 会長から一言 ---------------- */
function wireChairmanForm() {
  const form = document.getElementById("chairmanForm");
  const textarea = document.getElementById("chairmanBody");
  const imageInput = document.getElementById("chairmanImage");

  getDoc(doc(db, "siteContent", "chairmanMessage"))
    .then((snap) => {
      if (snap.exists()) {
        textarea.value = snap.data().body || "";
        imageInput.value = snap.data().imageUrl || "";
      }
    })
    .catch((e) => console.error("会長メッセージの取得に失敗しました:", e));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await setDoc(
        doc(db, "siteContent", "chairmanMessage"),
        {
          body: textarea.value.trim(),
          imageUrl: convertDriveLink(imageInput.value.trim()),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showMsg("chairmanMsg", "success", "保存しました。");
    } catch (e) {
      console.error(e);
      showMsg("chairmanMsg", "error", `保存に失敗しました: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- トップページ画像 ---------------- */
function wireBannerForm() {
  const form = document.getElementById("bannerForm");
  const imageInput = document.getElementById("bannerImage");
  const preview = document.getElementById("bannerPreview");

  getDoc(doc(db, "siteContent", "homeBanner"))
    .then((snap) => {
      const url = snap.exists() ? snap.data().imageUrl || "" : "";
      if (url) {
        imageInput.value = url;
        preview.src = url;
        preview.style.display = "block";
      }
    })
    .catch((e) => console.error("バナー画像の取得に失敗しました:", e));

  imageInput.addEventListener("input", () => {
    const url = convertDriveLink(imageInput.value.trim());
    if (url) {
      preview.src = url;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await setDoc(
        doc(db, "siteContent", "homeBanner"),
        {
          imageUrl: convertDriveLink(imageInput.value.trim()),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showMsg("bannerMsg", "success", "保存しました。トップページに反映されます。");
    } catch (e) {
      console.error(e);
      showMsg("bannerMsg", "error", `保存に失敗しました: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- おやじの会の歴史 ---------------- */
function wireHistoryForm() {
  const form = document.getElementById("historyForm");
  const textarea = document.getElementById("historyBody");
  const imageInput = document.getElementById("historyImage");
  const loadDraftBtn = document.getElementById("historyLoadDraft");

  getDoc(doc(db, "siteContent", "history"))
    .then((snap) => {
      if (snap.exists() && snap.data().body) {
        textarea.value = snap.data().body || "";
        imageInput.value = snap.data().imageUrl || "";
      } else {
        textarea.value = HISTORY_DEFAULT_BODY;
      }
    })
    .catch((e) => console.error("歴史ページの内容の取得に失敗しました:", e));

  loadDraftBtn.addEventListener("click", () => {
    if (textarea.value.trim() && !confirm("入力中の本文をたたき台の文章で上書きします。よろしいですか？")) return;
    textarea.value = HISTORY_DEFAULT_BODY;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await setDoc(
        doc(db, "siteContent", "history"),
        {
          body: textarea.value.trim(),
          imageUrl: convertDriveLink(imageInput.value.trim()),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showMsg("historyMsg", "success", "保存しました。");
    } catch (e) {
      console.error(e);
      showMsg("historyMsg", "error", `保存に失敗しました: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- 動画管理 ---------------- */
function wireVideoForm() {
  const form = document.getElementById("videoForm");
  const cancelBtn = document.getElementById("videoCancelEdit");
  const title = document.getElementById("videoFormTitle");

  cancelBtn.addEventListener("click", () => resetVideoForm());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("videoId").value;
    const youtubeId = extractYoutubeId(document.getElementById("videoUrl").value.trim());
    const msg = document.getElementById("videoFormMsg");
    if (!youtubeId) {
      showMsg("videoFormMsg", "error", "YouTube URLからIDを読み取れませんでした。URLをご確認ください。");
      return;
    }
    const data = {
      youtubeId,
      title: document.getElementById("videoTitle").value.trim(),
      category: document.getElementById("videoCategory").value.trim(),
      date: document.getElementById("videoDate").value,
      published: document.getElementById("videoPublished").value === "true",
    };
    try {
      if (id) {
        await updateDoc(doc(db, "videos", id), data);
      } else {
        await addDoc(collection(db, "videos"), { ...data, createdAt: serverTimestamp() });
      }
      showMsg("videoFormMsg", "success", "保存しました。");
      resetVideoForm();
      loadVideos();
    } catch (e) {
      console.error(e);
      showMsg("videoFormMsg", "error", `保存に失敗しました: ${e.message}`);
    }
  });

  function resetVideoForm() {
    form.reset();
    document.getElementById("videoId").value = "";
    title.textContent = "動画を追加";
    cancelBtn.style.display = "none";
  }
}

async function loadVideos() {
  const wrap = document.getElementById("videosTableWrap");
  try {
    const snap = await getDocs(query(collection(db, "videos"), orderBy("date", "desc")));
    if (snap.empty) {
      wrap.innerHTML = `<div class="empty-state">動画がまだありません。</div>`;
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>日付</th><th>タイトル</th><th>カテゴリー</th><th>状態</th><th>操作</th></tr></thead>
      <tbody>${snap.docs
        .map((d) => {
          const v = d.data();
          return `<tr>
            <td>${escapeHtml(v.date || "")}</td>
            <td><a href="https://www.youtube.com/watch?v=${escapeHtml(v.youtubeId)}" target="_blank" style="color:var(--red); font-weight:700;">${escapeHtml(v.title)}</a></td>
            <td>${escapeHtml(v.category || "")}</td>
            <td>${v.published ? '<span class="badge badge-approved">公開</span>' : '<span class="badge badge-pending">下書き</span>'}</td>
            <td class="row-actions">
              <button type="button" class="link-btn" data-edit="${d.id}">編集</button>
              <button type="button" class="link-btn" data-delete="${d.id}">削除</button>
            </td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>`;

    wrap.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "videos", btn.dataset.edit));
        if (!snap2.exists()) return;
        const v = snap2.data();
        document.getElementById("videoId").value = snap2.id;
        document.getElementById("videoUrl").value = `https://www.youtube.com/watch?v=${v.youtubeId || ""}`;
        document.getElementById("videoTitle").value = v.title || "";
        document.getElementById("videoCategory").value = v.category || "";
        document.getElementById("videoDate").value = v.date || "";
        document.getElementById("videoPublished").value = String(!!v.published);
        document.getElementById("videoFormTitle").textContent = "動画を編集";
        document.getElementById("videoCancelEdit").style.display = "inline-flex";
        document.querySelector('#adminTabs button[data-tab="videos"]').click();
        document.getElementById("videoForm").scrollIntoView({ behavior: "smooth" });
      });
    });
    wrap.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("この動画を削除しますか？")) return;
        await deleteDoc(doc(db, "videos", btn.dataset.delete));
        loadVideos();
      });
    });
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}

/* ---------------- アクセス状況 ---------------- */
async function loadStats() {
  const statGrid = document.getElementById("statGrid");
  const bars = document.getElementById("dailyBars");
  try {
    const summarySnap = await getDoc(doc(db, "stats", "summary"));
    const total = summarySnap.exists() ? summarySnap.data().totalViews || 0 : 0;

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts = await Promise.all(
      days.map(async (day) => {
        const snap = await getDoc(doc(db, "stats_daily", day));
        return snap.exists() ? snap.data().count || 0 : 0;
      })
    );
    const todayCount = counts[counts.length - 1] || 0;
    const max = Math.max(1, ...counts);

    statGrid.innerHTML = `
      <div class="stat-box"><div class="num">${total.toLocaleString("ja-JP")}</div><div class="label">総訪問数</div></div>
      <div class="stat-box"><div class="num">${todayCount.toLocaleString("ja-JP")}</div><div class="label">本日の訪問数</div></div>
      <div class="stat-box"><div class="num">${counts.reduce((a, b) => a + b, 0).toLocaleString("ja-JP")}</div><div class="label">直近14日間の合計</div></div>
    `;
    bars.innerHTML = days
      .map((day, i) => {
        const h = Math.max(3, Math.round((counts[i] / max) * 100));
        return `<div class="bar" style="height:${h}%;"><span>${counts[i]}</span></div>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
    statGrid.innerHTML = `<div class="alert alert-error">アクセス状況の読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
