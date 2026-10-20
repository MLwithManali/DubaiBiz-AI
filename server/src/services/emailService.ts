
import nodemailer from "nodemailer";

// ==========================================
// CONFIGURATION
// ==========================================

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_APP_PASSWORD;
const emailFrom = process.env.EMAIL_FROM;

// ==========================================
// SEND VERIFICATION EMAIL
// ==========================================

export async function sendVerificationEmail(
  email: string,
  otp: string
): Promise<void> {
  const recipient = email.trim().toLowerCase();

  if (!recipient) {
    throw new Error("Recipient email is required.");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new Error("Invalid OTP format.");
  }

  if (
    !smtpHost ||
    !smtpUser ||
    !smtpPassword ||
    !emailFrom
  ) {
    throw new Error(
      "Gmail SMTP environment variables are missing."
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to: recipient,
      subject: "DubaiBiz AI - Verify Your Email",
      text: [
        "Welcome to DubaiBiz AI!",
        "",
        "Your email verification code is:",
        "",
        otp,
        "",
        "This code expires in 10 minutes.",
        "",
        "If you did not register for DubaiBiz AI,",
        "please ignore this message.",
        "",
        "DubaiBiz AI Team",
      ].join("\n"),
    });

    console.log(
      "Verification email accepted by SMTP:",
      info.messageId
    );
  } catch (error) {
    console.error(
      "Gmail SMTP delivery failed:",
      error
    );

    throw new Error(
      "Unable to send verification email."
    );
  }
}
