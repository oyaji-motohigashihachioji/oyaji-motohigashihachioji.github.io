// EmailJS 設定（お問い合わせフォーム用）。
// https://www.emailjs.com/ で無料アカウント作成 → Email Service 追加 → Email Template 作成後、
// 下記の "YOUR_..." を実際の値に置き換えてください。詳細は FIREBASE_SETUP.md 参照。
export const emailjsConfig = {
  publicKey: "Mpi0MM-Zd76SMy-9Q",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID",
};

export const isEmailjsConfigured =
  !emailjsConfig.publicKey.startsWith("YOUR_") &&
  !emailjsConfig.serviceId.startsWith("YOUR_") &&
  !emailjsConfig.templateId.startsWith("YOUR_");
