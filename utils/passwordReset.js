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
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  const subject = "Reset your OwwiMoney password";
  const text = `Use this link to reset your password. It expires in 1 hour.\n\n${resetUrl}`;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.log(`[password-reset] Reset link for ${user.email || user.username}: ${resetUrl}`);
    return { sent: false, resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: user.email || user.username,
    subject,
    text,
    html: `<p>Use this link to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return { sent: true };
}

module.exports = {
  createResetToken,
  hashResetToken,
  getResetUrl,
  sendPasswordResetEmail,
};
