const crypto = require("crypto");
const nodemailer = require("nodemailer");

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  return { token, hashedToken, expiresAt };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getResetUrl(token) {
  const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
}

async function sendPasswordResetEmail(user, resetUrl) {
  const { SMTP_USER, SMTP_PASS } = process.env;
  const subject = "Reset your OwwiMoney password";
  const text = `Use this link to reset your password. It expires in 1 hour.\n\n${resetUrl}`;

  if (!SMTP_USER || !SMTP_PASS) {
    console.log(`[password-reset] Reset link for ${user.email || user.username}: ${resetUrl}`);
    return { sent: false, resetUrl };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const res = await transporter.sendMail({
    from: SMTP_USER,
    to: user.email || user.username,
    subject,
    text,
    html: `
      <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#0284c7,#2563eb);text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.3;">OwwiMoney</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">Reset your password</p>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new password.</p>
            <p style="margin:28px 0;text-align:center;">
              <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;padding:14px 28px;font-size:15px;">Reset password</a>
            </p>
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:</p>
            <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;">
              <a href="${resetUrl}" style="color:#2563eb;text-decoration:underline;">${resetUrl}</a>
            </p>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
          </div>
        </div>
      </div>`,
  });

  return { sent: true };
}

module.exports = {
  createResetToken,
  hashResetToken,
  getResetUrl,
  sendPasswordResetEmail,
};
