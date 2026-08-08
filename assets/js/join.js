import { initSite } from "./site.js";

await initSite("join");

const yearsEl = document.getElementById("yearsActive");
if (yearsEl) {
  yearsEl.textContent = new Date().getFullYear() - 2009;
}
