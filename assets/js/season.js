// 現在の季節を判定し、控えめな季節モチーフをヘッダーの近くに1つだけ添える。
// 派手な演出は避け、日本語コミュニティサイトらしい「季節感」の小さな演出に留める。
export function getSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

const SEASON_ICONS = {
  spring: `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="#F7C6D9" stroke="#100F0D" stroke-width="1.2">
      <path d="M20 6c3 3 3 7 0 10-3-3-3-7 0-10z"/>
      <path d="M34 20c-3 3-7 3-10 0 3-3 7-3 10 0z"/>
      <path d="M20 34c-3-3-3-7 0-10 3 3 3 7 0 10z"/>
      <path d="M6 20c3-3 7-3 10 0-3 3-7 3-10 0z"/>
      <path d="M27 13c1.5 4 -1 7.5 -5 9 -1.5-4 1-7.5 5-9z"/>
    </g><circle cx="20" cy="20" r="3" fill="#D9A400" stroke="#100F0D" stroke-width="1"/></svg>`,
  summer: `<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="#100F0D" stroke-width="1.3">
      <ellipse cx="20" cy="20" rx="11" ry="14" fill="#BE3A26"/>
      <path d="M9 20h22M11 13c4 3 14 3 18 0M11 27c4-3 14-3 18 0" fill="none"/>
      <path d="M20 4v4M20 32v4" fill="none"/>
    </g></svg>`,
  autumn: `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="#D9762C" stroke="#100F0D" stroke-width="1.2">
      <path d="M20 5c6 4 6 12 10 14-4 1-8-1-10-4 0 4 2 8 6 11-5 1-9-2-11-6-2 4-6 7-11 6 4-3 6-7 6-11-2 3-6 5-10 4 4-2 4-10 10-14 3 2 4 2 6 0 2 2 3 2 6 0z"/>
      <path d="M20 5v26" stroke-width="1"/>
    </g></svg>`,
  winter: `<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="#100F0D" stroke-width="1.6" stroke-linecap="round">
      <path d="M20 6v28M8 13l24 14M32 13L8 27"/>
      <path d="M20 6l-4 4M20 6l4 4M20 34l-4-4M20 34l4-4"/>
      <path d="M8 13l5 1M8 13l1 5M32 13l-5 1M32 13l-1 5M8 27l5-1M8 27l1-5M32 27l-5-1M32 27l-1-5"/>
    </g></svg>`,
};

const SEASON_LABEL = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };

// #seasonIcon のような要素に季節アイコンを描画する
export function mountSeasonIcon(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const season = getSeason();
  el.innerHTML = SEASON_ICONS[season];
  el.title = `${SEASON_LABEL[season]}の装い`;
  el.classList.add(`season-${season}`);
}
