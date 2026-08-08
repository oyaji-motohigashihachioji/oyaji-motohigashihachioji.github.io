import { initSite } from "./site.js";
import { watchAuth, isApproved, escapeHtml } from "./auth-guard.js";
import { db, isFirebaseConfigured } from "./firebase-init.js";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

await initSite("members");

const gate = document.getElementById("membersGate");
const list = document.getElementById("membersList");

if (!isFirebaseConfigured) {
  gate.innerHTML = `<div class="alert alert-error">Firebaseが未設定のため、会員一覧は利用できません。</div>`;
} else {
  watchAuth((user, profile) => {
    if (!user) {
      gate.innerHTML = `<div class="alert alert-info">会員一覧の閲覧にはログインが必要です。 <a href="login.html" style="color:var(--red); font-weight:700;">ログインする →</a></div>`;
      return;
    }
    if (!isApproved(profile)) {
      gate.innerHTML = `<div class="alert alert-info">現在、管理者の承認待ちです。承認され次第、会員一覧をご覧いただけます。</div>`;
      return;
    }
    gate.style.display = "none";
    list.style.display = "grid";
    loadMembers();
  });
}

async function loadMembers() {
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("status", "==", "approved"), orderBy("joinedAt", "asc"))
    );
    if (snap.empty) {
      list.innerHTML = `<div class="empty-state">会員がまだいません。</div>`;
      return;
    }
    list.innerHTML = snap.docs
      .map((d) => {
        const m = d.data();
        const year = m.joinedAt?.toDate ? m.joinedAt.toDate().getFullYear() : "-";
        return `<article class="card">
          <div class="body" style="text-align:center; padding-top:26px;">
            ${m.photoURL ? `<img class="avatar avatar-lg" src="${escapeHtml(m.photoURL)}" alt="" style="margin:0 auto 14px;">` : ""}
            <h3 style="margin-bottom:6px;">${escapeHtml(m.displayName)}</h3>
            <span class="badge badge-role">${escapeHtml(m.position || "一般会員")}</span>
            ${m.role === "admin" ? '<span class="badge badge-admin" style="margin-left:6px;">管理者</span>' : ""}
            <p style="margin-top:12px; font-size:12.5px; color:#7d7562;">${year}年 入会</p>
          </div>
        </article>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="alert alert-error">読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
  }
}
