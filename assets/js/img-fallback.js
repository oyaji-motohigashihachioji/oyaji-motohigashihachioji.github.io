// Googleドライブ由来の画像（lh3.googleusercontent.com / drive.google.com）が
// 環境（ブラウザのCookie状態、アプリ内ブラウザ等）によって読み込めない場合に、
// 別のURL形式で自動的に再試行するフォールバック。サイト全体で1回だけ初期化する。
const DRIVE_ID_RE = /\/d\/([a-zA-Z0-9_-]{10,})|[?&]id=([a-zA-Z0-9_-]{10,})/;

function extractDriveId(url) {
  const m = url.match(DRIVE_ID_RE);
  return m ? m[1] || m[2] : null;
}

function nextFallbackUrl(originalUrl, attempt) {
  const id = extractDriveId(originalUrl);
  if (!id) return null;
  const variants = [
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
  return variants[attempt] || null;
}

let initialized = false;

export function initImageFallback() {
  if (initialized) return;
  initialized = true;
  // 画像の error イベントはバブリングしないため capture フェーズで拾う
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (!/googleusercontent\.com|drive\.google\.com/.test(img.src)) return;

      if (!img.dataset.origSrc) img.dataset.origSrc = img.src;
      const attempt = Number(img.dataset.fallbackAttempt || "0");
      const next = nextFallbackUrl(img.dataset.origSrc, attempt);
      if (next) {
        img.dataset.fallbackAttempt = String(attempt + 1);
        img.src = next;
      }
    },
    true
  );
}
