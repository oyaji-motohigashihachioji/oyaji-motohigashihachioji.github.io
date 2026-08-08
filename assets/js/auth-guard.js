// 認証状態の監視、ヘッダーのログイン/マイページ表示切替、
// ページごとのアクセス制御（承認済み会員のみ／管理者のみ）ヘルパー。
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// user: FirebaseのAuthユーザー, profile: Firestoreの users/{uid} ドキュメント内容
export function watchAuth(callback) {
  if (!isFirebaseConfigured) {
    callback(null, null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    try {
      const ref = doc(db, "users", user.uid);
      let snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: user.displayName || "名無しのおやじ",
          email: user.email || "",
          photoURL: user.photoURL || "",
          bio: "",
          role: "member",
          position: "一般会員",
          status: "pending",
          joinedAt: serverTimestamp(),
        });
        snap = await getDoc(ref);
      }
      callback(user, { id: snap.id, ...snap.data() });
    } catch (e) {
      console.error("プロフィール取得に失敗しました:", e);
      callback(user, null);
    }
  });
}

export async function loginWithGoogle() {
  if (!isFirebaseConfigured) throw new Error("Firebaseが未設定です");
  return signInWithPopup(auth, googleProvider);
}

export async function logout() {
  if (!isFirebaseConfigured) return;
  return signOut(auth);
}

export function isApproved(profile) {
  return !!profile && (profile.status === "approved" || profile.role === "admin");
}

export function isAdmin(profile) {
  return !!profile && profile.role === "admin";
}

// ヘッダー内の #authNavSlot をログイン状態に応じて描画する
export function initAuthNav() {
  const slot = document.getElementById("authNavSlot");
  if (!slot) return;

  if (!isFirebaseConfigured) {
    slot.innerHTML = `<a href="login.html" class="nav-cta">ログイン</a>`;
    return;
  }

  watchAuth((user, profile) => {
    if (!user) {
      slot.innerHTML = `<a href="login.html" class="nav-cta">ログイン</a>`;
      return;
    }
    const admin = isAdmin(profile);
    const name = escapeHtml(profile?.displayName || user.displayName || "マイページ");
    const photo = escapeHtml(profile?.photoURL || user.photoURL || "");
    slot.innerHTML = `
      <a href="mypage.html" class="nav-avatar-link" data-page="mypage">
        ${photo ? `<img class="nav-avatar" src="${photo}" alt="">` : ""}
        <span>${name}</span>
      </a>
      ${admin ? `<a href="admin.html" data-page="admin">管理</a>` : ""}
      <button type="button" id="navLogoutBtn" class="nav-cta">ログアウト</button>
    `;
    document.getElementById("navLogoutBtn")?.addEventListener("click", async () => {
      await logout();
      location.href = "index.html";
    });
  });
}
