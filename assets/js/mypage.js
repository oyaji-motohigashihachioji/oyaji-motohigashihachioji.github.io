import { initSite } from "./site.js";
import { watchAuth, isApproved, isAdmin, escapeHtml } from "./auth-guard.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import { convertDriveLink } from "./drive-link.js";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("mypage");

const content = document.getElementById("mypageContent");

if (!isFirebaseConfigured) {
  content.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、マイページは利用できません。</div>`;
} else {
  watchAuth((user, profile) => {
    if (!user) {
      location.href = "login.html";
      return;
    }
    if (!isApproved(profile)) {
      content.innerHTML = `<div class="alert alert-info">現在、管理者の承認待ちです。承認されるとマイページがご利用いただけます。</div>`;
      return;
    }
    renderProfile(user, profile);
  });
}

function renderProfile(user, profile) {
  content.innerHTML = `
    <div class="form-card" style="max-width:640px; margin-bottom:44px;">
      <div style="display:flex; gap:20px; align-items:center; margin-bottom:24px; flex-wrap:wrap;">
        ${profile.photoURL ? `<img class="avatar avatar-lg" src="${escapeHtml(profile.photoURL)}" alt="">` : ""}
        <div>
          <div style="font-weight:700; font-size:19px;">${escapeHtml(profile.displayName)}</div>
          <div style="font-size:13px; color:#7d7562; margin-bottom:8px;">${escapeHtml(profile.email)}</div>
          <span class="badge badge-role">${escapeHtml(profile.position || "一般会員")}</span>
          ${isAdmin(profile) ? '<span class="badge badge-admin" style="margin-left:6px;">管理者</span>' : ""}
        </div>
      </div>
      <div id="profileMsg"></div>
      <form id="profileForm">
        <div class="field">
          <label for="displayName">ニックネーム</label>
          <input id="displayName" type="text" value="${escapeHtml(profile.displayName)}" required maxlength="40">
        </div>
        <div class="field-row">
          <div class="field">
            <label for="age">年齢</label>
            <input id="age" type="number" min="0" max="120" value="${profile.age ?? ""}">
          </div>
          <div class="field">
            <label for="phone">電話番号</label>
            <input id="phone" type="tel" maxlength="20" value="${escapeHtml(profile.phone || "")}" placeholder="090-1234-5678">
          </div>
        </div>
        <div class="field">
          <label for="hobby">趣味</label>
          <input id="hobby" type="text" maxlength="100" value="${escapeHtml(profile.hobby || "")}" placeholder="釣り、キャンプ、野球観戦 など">
        </div>
        <div class="field">
          <label for="bio">自己紹介</label>
          <textarea id="bio" maxlength="500" placeholder="よろしくお願いします！">${escapeHtml(profile.bio || "")}</textarea>
        </div>
        <div class="field">
          <label for="photoURL">アバター画像URL（任意・Googleドライブ共有リンク可）</label>
          <input id="photoURL" type="text" value="${escapeHtml(profile.photoURL || "")}" placeholder="https://drive.google.com/file/d/xxxx/view">
          <div class="hint">空欄のままにするとGoogleアカウントの写真が使われます。役職はメンバー欄で表示されますが、変更は管理者のみ可能です。</div>
        </div>
        <button type="submit" class="btn btn-primary">保存する</button>
      </form>
    </div>

    <h3 style="margin-bottom:16px;">自分のブログ投稿</h3>
    <div id="myPostsList"><div class="empty-state">読み込み中…</div></div>
  `;

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("profileMsg");
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const ageVal = document.getElementById("age").value;
      await updateDoc(doc(db, "users", user.uid), {
        displayName: document.getElementById("displayName").value.trim(),
        age: ageVal === "" ? null : Number(ageVal),
        phone: document.getElementById("phone").value.trim(),
        hobby: document.getElementById("hobby").value.trim(),
        bio: document.getElementById("bio").value.trim(),
        photoURL: convertDriveLink(document.getElementById("photoURL").value.trim()),
      });
      msg.innerHTML = `<div class="alert alert-success">保存しました。</div>`;
    } catch (err) {
      console.error(err);
      msg.innerHTML = `<div class="alert alert-error">保存に失敗しました: ${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  });

  renderMyPosts(user);
}

async function renderMyPosts(user) {
  const list = document.getElementById("myPostsList");
  try {
    const q = query(
      collection(db, "blogPosts"),
      where("authorUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      list.innerHTML = `<div class="empty-state">まだ投稿がありません。<a href="blog.html" style="color:var(--red); font-weight:700;">ブログを書く →</a></div>`;
      return;
    }
    list.innerHTML = `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>タイトル</th><th>投稿日</th><th>公開状態</th><th>操作</th></tr></thead>
      <tbody>${snap.docs
        .map((d) => {
          const p = d.data();
          const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("ja-JP") : "-";
          return `<tr>
            <td>${escapeHtml(p.title)}</td>
            <td>${date}</td>
            <td>${p.published ? '<span class="badge badge-approved">公開中</span>' : '<span class="badge badge-pending">下書き</span>'}</td>
            <td class="row-actions">
              <a class="link-btn" href="blog.html?id=${d.id}">表示</a>
              <a class="link-btn" href="blog.html?edit=${d.id}">編集</a>
              <button type="button" class="link-btn" data-delete="${d.id}">削除</button>
            </td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>`;

    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("この投稿を削除しますか？")) return;
        await deleteDoc(doc(db, "blogPosts", btn.dataset.delete));
        renderMyPosts(user);
      });
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
