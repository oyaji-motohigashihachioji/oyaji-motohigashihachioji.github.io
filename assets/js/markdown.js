// ごく簡易的なMarkdown対応（外部ライブラリなし）。
// 対応: # / ## 見出し、**太字**、空行区切りの段落、単一改行の<br>。
// 常に先にHTMLエスケープしてからタグを組み立てるため、入力に生のHTMLタグが
// 含まれていてもそのまま文字として表示され、安全に処理される。
import { escapeHtml } from "./auth-guard.js";

function inlineFormat(line) {
  return escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

export function renderMarkdown(text) {
  const lines = (text || "").split("\n");
  const html = [];
  let inParagraph = false;

  const closeParagraph = () => {
    if (inParagraph) {
      html.push("</p>");
      inParagraph = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      closeParagraph();
      continue;
    }
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = !h2 && line.match(/^#\s+(.*)/);
    if (h2) {
      closeParagraph();
      html.push(`<h3>${inlineFormat(h2[1])}</h3>`);
      continue;
    }
    if (h1) {
      closeParagraph();
      html.push(`<h2>${inlineFormat(h1[1])}</h2>`);
      continue;
    }
    if (!inParagraph) {
      html.push("<p>");
      inParagraph = true;
    } else {
      html.push("<br>");
    }
    html.push(inlineFormat(line));
  }
  closeParagraph();
  return html.join("");
}

// 一覧の抜粋表示用: Markdown記号を取り除いた素のテキストを返す
export function stripMarkdown(text) {
  return (text || "")
    .replace(/^#{1,2}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}
