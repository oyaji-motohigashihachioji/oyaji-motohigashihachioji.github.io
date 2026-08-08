// Google Drive の共有リンクを <img> で直接表示できる画像URLに変換するヘルパー。
// 対応入力例:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID&export=view
// 認識できない形式（他サービスの直URL等）はそのまま返す。
export function convertDriveLink(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  const patterns = [/\/d\/([a-zA-Z0-9_-]{10,})/, /[?&]id=([a-zA-Z0-9_-]{10,})/];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return trimmed;
}

export function isLikelyDriveShareLink(url) {
  return /drive\.google\.com/.test(url || "");
}
