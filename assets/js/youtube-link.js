// YouTubeのURL（watch?v=, youtu.be/, shorts/, embed/ 等の各形式・末尾の &t=4s 等のパラメータ付きも）
// から11文字の動画IDだけを取り出す。入力が既に素のIDならそのまま返す。
const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYoutubeId(url) {
  if (!url) return "";
  const trimmed = url.trim();
  const match = trimmed.match(YOUTUBE_ID_RE);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return "";
}
