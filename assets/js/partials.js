// 共通ヘッダー/フッターを各ページに fetch で読み込み、アクティブなナビゲーションリンクの
// ハイライトとモバイルメニューのハンバーガー開閉を初期化する。
export async function loadPartials(activePage) {
  const headerSlot = document.getElementById("site-header");
  const footerSlot = document.getElementById("site-footer");

  const [headerHtml, footerHtml] = await Promise.all([
    fetch("assets/partials/header.html", { cache: "no-cache" }).then((r) => r.text()),
    fetch("assets/partials/footer.html", { cache: "no-cache" }).then((r) => r.text()),
  ]);

  if (headerSlot) headerSlot.innerHTML = headerHtml;
  if (footerSlot) footerSlot.innerHTML = footerHtml;

  if (activePage) {
    document.querySelectorAll(`nav.links a[data-page="${activePage}"]`).forEach((a) => {
      a.classList.add("active-link");
    });
  }

  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("navLinks");
  burger?.addEventListener("click", () => {
    nav?.classList.toggle("open");
  });
}
