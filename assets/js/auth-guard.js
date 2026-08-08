// 認証状態の監視、ヘッダーのログイン/マイページ表示切替、
// ページごとのアクセス制御（承認済み会員のみ／管理者のみ）ヘルパー。
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
          age: null,
          phone: "",
          hobby: "",
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

export async function registerWithEmail(email, password, displayName) {
  if (!isFirebaseConfigured) throw new Error("Firebaseが未設定です");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  await sendEmailVerification(cred.user);
  return cred;
}

export async function loginWithEmail(email, password) {
  if (!isFirebaseConfigured) throw new Error("Firebaseが未設定です");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  if (!isFirebaseConfigured) throw new Error("Firebaseが未設定です");
  return sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  if (!isFirebaseConfigured || !auth.currentUser) return;
  return sendEmailVerification(auth.currentUser);
}

export function isPasswordProvider(user) {
  return !!user?.providerData?.some((p) => p.providerId === "password");
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("ログイン情報が確認できません");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "このメールアドレスは既に登録されています。",
  "auth/invalid-email": "メールアドレスの形式が正しくありません。",
  "auth/weak-password": "パスワードは6文字以上で設定してください。",
  "auth/wrong-password": "パスワードが正しくありません。",
  "auth/user-not-found": "このメールアドレスの会員情報が見つかりません。",
  "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。",
  "auth/too-many-requests": "試行回数が多すぎます。しばらくしてから再度お試しください。",
  "auth/requires-recent-login": "セキュリティのため、再度ログインしてからお試しください。",
};

export function translateAuthError(code) {
  return AUTH_ERROR_MESSAGES[code] || "エラーが発生しました。時間をおいて再度お試しください。";
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
