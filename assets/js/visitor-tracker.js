// セッション単位（タブを開いている間に1回）で訪問者数をFirestoreに加算する。
// ログイン不要・匿名訪問者も含めてカウントする簡易カウンター。
import { db, isFirebaseConfigured } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const SESSION_FLAG = "oyaji_visit_tracked";

export async function trackVisit() {
  if (!isFirebaseConfigured) return;
  if (sessionStorage.getItem(SESSION_FLAG)) return;
  sessionStorage.setItem(SESSION_FLAG, "1");

  const today = new Date().toISOString().slice(0, 10);
  try {
    await Promise.all([
      setDoc(
        doc(db, "stats", "summary"),
        { totalViews: increment(1), lastVisit: serverTimestamp() },
        { merge: true }
      ),
      setDoc(
        doc(db, "stats_daily", today),
        { date: today, count: increment(1) },
        { merge: true }
      ),
    ]);
  } catch (e) {
    console.warn("訪問者カウントの記録に失敗しました:", e);
  }
}

// フッターの訪問者数表示を更新する（読み取りのみ、失敗時は非表示のまま）
export async function renderVisitorCount() {
  const box = document.getElementById("visitorCountBox");
  const num = document.getElementById("visitorCountNum");
  if (!box || !num || !isFirebaseConfigured) return;
  try {
    const snap = await getDoc(doc(db, "stats", "summary"));
    if (snap.exists() && typeof snap.data().totalViews === "number") {
      num.textContent = snap.data().totalViews.toLocaleString("ja-JP");
      box.style.display = "block";
    }
  } catch (e) {
    console.warn("訪問者数の取得に失敗しました:", e);
  }
}
