
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

import { validateEmail } from "../utils/emailValidation.js";
import { validatePassword } from "../utils/passwordValidation.js";

import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../utils/otp.js";

import { sendVerificationEmail } from "../services/emailService.js";

// ==========================================
// CONFIGURATION
// ==========================================

const PASSWORD_HASH_ROUNDS = 12;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

// ==========================================
// TYPES
// ==========================================

interface AuthRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  otp?: unknown;
}

interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

// ==========================================
// RESPONSE HELPERS
// ==========================================

function sendError(
  res: Response,
  status: number,
  message: string,
  extra: Record<string, unknown> = {}
): void {
  res.status(status).json({
    success: false,
    message,
    ...extra,
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function sendAccountExistsResponse(res: Response): void {
  sendError(
    res,
    409,
    "This email is already registered. Please sign in or verify your email."
  );
}

// ==========================================
// VALIDATION
// ==========================================

function validateName(name: unknown): string | null {
  if (typeof name !== "string") {
    return "Full name is required.";
  }

  const cleanName = name.trim();

  if (cleanName.length < 2 || cleanName.length > 100) {
    return "Full name must contain 2 to 100 characters.";
  }

  const namePattern = /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u;

  if (!namePattern.test(cleanName)) {
    return "Full name must contain letters only.";
  }

  return null;
}

function validateRegistrationEmail(
  email: unknown
): string | null {
  if (typeof email !== "string") {
    return "Email address is required.";
  }

  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return "Email address is required.";
  }

  if (cleanEmail.length > MAX_EMAIL_LENGTH) {
    return "Email address must not exceed 254 characters.";
  }

  return validateEmail(cleanEmail);
}

function validEmailInput(
  email: unknown
): email is string {
  return (
    typeof email === "string" &&
    validateRegistrationEmail(email) === null
  );
}

// ==========================================
// JWT
// ==========================================

function createToken(userId: number): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters."
    );
  }

  return jwt.sign(
    { sub: String(userId) },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "1h",
    }
  );
}

// ==========================================
// OTP HELPERS
// ==========================================

function createOtpExpiry(now: Date): Date {
  return new Date(
    now.getTime() + OTP_EXPIRY_MINUTES * 60_000
  );
}

function isCooldownActive(lastSentAt: Date): boolean {
  return (
    Date.now() - lastSentAt.getTime() <
    OTP_RESEND_COOLDOWN_SECONDS * 1000
  );
}

async function createInitialOtp(
  userId: number
): Promise<string> {
  const otp = generateOtp();
  const now = new Date();

  await prisma.emailVerificationOtp.upsert({
    where: { userId },
    create: {
      userId,
      otpHash: hashOtp(userId, otp),
      expiresAt: createOtpExpiry(now),
      attempts: 0,
      lastSentAt: now,
    },
    update: {
      otpHash: hashOtp(userId, otp),
      expiresAt: createOtpExpiry(now),
      attempts: 0,
      lastSentAt: now,
    },
  });

  return otp;
}

// ==========================================
// REGISTER
// POST /api/auth/register
// ==========================================

export async function register(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body = (req.body ?? {}) as AuthRequestBody;
    const { name, email, password } = body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      sendError(
        res,
        400,
        "Full name, email address and password are required."
      );
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);

    const nameError = validateName(cleanName);

    if (nameError) {
      sendError(res, 400, nameError);
      return;
    }

    const emailError =
      validateRegistrationEmail(cleanEmail);

    if (emailError) {
      sendError(res, 400, emailError);
      return;
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      sendError(res, 400, "Password is too long.");
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      sendError(res, 400, passwordError);
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (existingUser) {
      sendAccountExistsResponse(res);
      return;
    }

    const passwordHash = await bcrypt.hash(
      password,
      PASSWORD_HASH_ROUNDS
    );

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: "USER",
        emailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const otp = await createInitialOtp(user.id);

    try {
      await sendVerificationEmail(cleanEmail, otp);
    } catch (error) {
      console.error(
        "Registration email delivery failed:",
        error
      );

      sendError(
        res,
        503,
        "Account created, but the verification email could not be delivered. Please check the email service configuration and try resending the code.",
        { requiresVerification: true }
      );
      return;
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Account created. Please check your email for a verification code.",
      data: user,
    });
  } catch (error) {
    if (isUniqueError(error)) {
      sendAccountExistsResponse(res);
      return;
    }

    console.error("Registration error:", error);

    sendError(
      res,
      500,
      "Unable to create account. Please try again later."
    );
  }
}

// ==========================================
// VERIFY EMAIL
// POST /api/auth/verify-email
// ==========================================

export async function verifyEmail(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body = (req.body ?? {}) as AuthRequestBody;
    const { email, otp } = body;

    if (
      !validEmailInput(email) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      sendError(
        res,
        400,
        "A valid email and six-digit verification code are required."
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: {
        id: true,
        emailVerified: true,
      },
    });

    if (!user || user.emailVerified) {
      sendError(
        res,
        400,
        "Invalid or expired verification code."
      );
      return;
    }

    const challenge =
      await prisma.emailVerificationOtp.findUnique({
        where: { userId: user.id },
      });

    if (
      !challenge ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.attempts >= OTP_MAX_ATTEMPTS
    ) {
      sendError(
        res,
        400,
        "Invalid or expired verification code. Request a new code."
      );
      return;
    }

    const valid = verifyOtpHash(
      user.id,
      otp,
      challenge.otpHash
    );

    if (!valid) {
      await prisma.emailVerificationOtp.updateMany({
        where: {
          id: challenge.id,
          otpHash: challenge.otpHash,
          expiresAt: { gt: new Date() },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      sendError(
        res,
        400,
        "Invalid or expired verification code."
      );
      return;
    }

    const verified = await prisma.$transaction(
      async (tx) => {
        const claimed =
          await tx.emailVerificationOtp.deleteMany({
            where: {
              id: challenge.id,
              userId: user.id,
              otpHash: challenge.otpHash,
              expiresAt: { gt: new Date() },
              attempts: { lt: OTP_MAX_ATTEMPTS },
            },
          });

        if (claimed.count !== 1) {
          return false;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });

        return true;
      }
    );

    if (!verified) {
      sendError(
        res,
        400,
        "Invalid or expired verification code."
      );
      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    sendError(
      res,
      500,
      "Unable to verify email. Please try again."
    );
  }
}

// ==========================================
// RESEND OTP
// POST /api/auth/resend-otp
// ==========================================

export async function resendOtp(
  req: Request,
  res: Response
): Promise<void> {
  const genericMessage =
    "If the account requires verification, a code will be sent when eligible.";

  try {
    const body = (req.body ?? {}) as AuthRequestBody;

    if (!validEmailInput(body.email)) {
      sendError(
        res,
        400,
        "A valid email address is required."
      );
      return;
    }

    const email = normalizeEmail(body.email);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerified: true,
      },
    });

    if (!user || user.emailVerified) {
      res.status(200).json({
        success: true,
        message: genericMessage,
      });
      return;
    }

    const existing =
      await prisma.emailVerificationOtp.findUnique({
        where: { userId: user.id },
      });

    if (
      existing &&
      isCooldownActive(existing.lastSentAt)
    ) {
      res.status(200).json({
        success: true,
        message: genericMessage,
      });
      return;
    }

    const otp = generateOtp();
    const now = new Date();
    const otpHash = hashOtp(user.id, otp);
    const expiresAt = createOtpExpiry(now);

    const cutoff = new Date(
      now.getTime() -
        OTP_RESEND_COOLDOWN_SECONDS * 1000
    );

    let claimed = false;

    if (existing) {
      const result =
        await prisma.emailVerificationOtp.updateMany({
          where: {
            userId: user.id,
            lastSentAt: { lte: cutoff },
          },
          data: {
            otpHash,
            expiresAt,
            attempts: 0,
            lastSentAt: now,
          },
        });

      claimed = result.count === 1;
    } else {
      try {
        await prisma.emailVerificationOtp.create({
          data: {
            userId: user.id,
            otpHash,
            expiresAt,
            attempts: 0,
            lastSentAt: now,
          },
        });

        claimed = true;
      } catch (error) {
        if (!isUniqueError(error)) {
          throw error;
        }
      }
    }

    if (!claimed) {
      res.status(200).json({
        success: true,
        message: genericMessage,
      });
      return;
    }

    try {
      await sendVerificationEmail(email, otp);
    } catch (error) {
      console.error(
        "OTP resend delivery failed:",
        error
      );

      // The OTP remains stored for verification.
      // Do not expose the email provider's internal
      // error or credentials in the API response.
      sendError(
        res,
        503,
        "Verification email could not be delivered. Please try again later or contact support."
      );
      return;
    }

    res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("OTP resend error:", error);

    sendError(
      res,
      500,
      "Unable to process the request."
    );
  }
}

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body = (req.body ?? {}) as AuthRequestBody;
    const { email, password } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      sendError(
        res,
        400,
        "Email address and password are required."
      );
      return;
    }

    const cleanEmail = normalizeEmail(email);

    if (
      !cleanEmail ||
      cleanEmail.length > MAX_EMAIL_LENGTH ||
      !password ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      sendError(
        res,
        401,
        "Invalid email or password."
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (
      !user ||
      !(await bcrypt.compare(
        password,
        user.passwordHash
      ))
    ) {
      sendError(
        res,
        401,
        "Invalid email or password."
      );
      return;
    }

    if (!user.emailVerified) {
      sendError(
        res,
        403,
        "Please verify your email before logging in.",
        { requiresVerification: true }
      );
      return;
    }

    const token = createToken(user.id);

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    sendError(
      res,
      500,
      "Unable to log in. Please try again later."
    );
  }
}

// ==========================================
// CURRENT USER
// GET /api/auth/me
// ==========================================

export async function getCurrentUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (
      typeof userId !== "number" ||
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      sendError(
        res,
        401,
        "Authentication required."
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendError(
        res,
        401,
        "Account not found."
      );
      return;
    }

    if (!user.emailVerified) {
      sendError(
        res,
        403,
        "Email verification required."
      );
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Current user error:", error);

    sendError(
      res,
      500,
      "Unable to retrieve account information."
    );
  }
}
