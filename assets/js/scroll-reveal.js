// class="reveal" が付いた要素を、画面内にスクロールで入ってきたタイミングでふわっと表示する。
// 静的なHTMLでも、あとから動的に挿入された要素（ギャラリー・カード等）でも
// 自動的に検出できるよう MutationObserver で監視する。
let io = null;

function ensureObserver() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  return io;
}

function observeAll() {
  document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => ensureObserver().observe(el));
}

export function initScrollReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
    return;
  }
  observeAll();
  const mo = new MutationObserver(() => observeAll());
  mo.observe(document.body, { childList: true, subtree: true });
}
