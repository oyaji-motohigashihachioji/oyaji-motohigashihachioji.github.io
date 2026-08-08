import { initSite } from "./site.js";
import { emailjsConfig, isEmailjsConfigured } from "./emailjs-config.js";
import { escapeHtml } from "./auth-guard.js";

await initSite("contact");

const form = document.getElementById("contactForm");
const msg = document.getElementById("contactMsg");

if (!isEmailjsConfigured) {
  msg.innerHTML = `<div class="alert alert-info">現在オンライン送信フォームは準備中です。お手数ですが下記のメールアドレスへ直接ご連絡ください。</div>`;
} else if (window.emailjs) {
  window.emailjs.init({ publicKey: emailjsConfig.publicKey });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isEmailjsConfigured || !window.emailjs) {
    msg.innerHTML = `<div class="alert alert-error">現在、送信フォームは利用できません。メールで直接お問い合わせください。</div>`;
    return;
  }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "送信中…";
  try {
    await window.emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
      from_name: document.getElementById("cName").value,
      from_email: document.getElementById("cEmail").value,
      message: document.getElementById("cMessage").value,
    });
    msg.innerHTML = `<div class="alert alert-success">送信しました。ご連絡ありがとうございます。</div>`;
    form.reset();
  } catch (err) {
    console.error(err);
    msg.innerHTML = `<div class="alert alert-error">送信に失敗しました: ${escapeHtml(err?.text || err?.message || "不明なエラー")}。時間をおいて再度お試しいただくか、メールで直接ご連絡ください。</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "送信する";
  }
});
