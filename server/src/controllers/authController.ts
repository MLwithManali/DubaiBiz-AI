
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

import { validateEmail } from "../utils/emailValidation.js";

import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../utils/otp.js";

import { sendVerificationEmail } from "../services/emailService.js";

// ======================================================
// DUBAIBIZ AI - AUTHENTICATION CONTROLLER
// ======================================================
//
// Features:
// 1. Register
// 2. Verify Email OTP
// 3. Resend Email OTP
// 4. Login
// 5. Get Current User
// 6. Update Profile
// 7. Change Password
//
// ======================================================

// ======================================================
// CONFIGURATION
// ======================================================

const PASSWORD_HASH_ROUNDS = 12;

const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

// ======================================================
// TYPES
// ======================================================

interface AuthRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  otp?: unknown;
}

interface ChangePasswordBody {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
}

interface UpdateProfileBody {
  name?: unknown;
}

interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface PasswordCheckResult {
  valid: boolean;
  message: string | null;
}

// ======================================================
// RESPONSE HELPERS
// ======================================================

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

function sendSuccess(
  res: Response,
  status: number,
  message: string,
  data?: unknown
): void {
  res.status(status).json({
    success: true,
    message,
    ...(data === undefined ? {} : { data }),
  });
}

// ======================================================
// EMAIL HELPERS
// ======================================================

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmailInput(
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

function isValidEmail(
  email: unknown
): email is string {
  return validateEmailInput(email) === null;
}

// ======================================================
// NAME VALIDATION
// ======================================================

function validateName(name: unknown): string | null {
  if (typeof name !== "string") {
    return "Full name is required.";
  }

  const cleanName = name.trim();

  if (
    cleanName.length < MIN_NAME_LENGTH ||
    cleanName.length > MAX_NAME_LENGTH
  ) {
    return "Full name must contain 2 to 100 characters.";
  }

  const namePattern =
    /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u;

  if (!namePattern.test(cleanName)) {
    return "Full name must contain letters only.";
  }

  return null;
}

// ======================================================
// PASSWORD VALIDATION
// ======================================================
//
// Local validation avoids the conflicting return types
// previously reported by TypeScript.
//
// ======================================================

function checkPassword(
  password: unknown
): PasswordCheckResult {
  if (typeof password !== "string") {
    return {
      valid: false,
      message: "Password is required.",
    };
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      valid: false,
      message:
        "Password must contain 12 to 128 characters.",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one uppercase letter.",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one lowercase letter.",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one number.",
    };
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one special character.",
    };
  }

  if (/\s/.test(password)) {
    return {
      valid: false,
      message:
        "Password must not contain spaces.",
    };
  }

  return {
    valid: true,
    message: null,
  };
}

// ======================================================
// PRISMA HELPERS
// ======================================================

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function sendAccountExistsResponse(
  res: Response
): void {
  sendError(
    res,
    409,
    "This email is already registered. Please sign in or verify your email."
  );
}

// ======================================================
// AUTHENTICATED USER ID
// ======================================================

function getAuthenticatedUserId(
  req: AuthRequest
): number | null {
  const userId = req.user?.id;

  if (
    typeof userId !== "number" ||
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    return null;
  }

  return userId;
}

// ======================================================
// JWT
// ======================================================

function createToken(userId: number): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters."
    );
  }

  return jwt.sign(
    {
      sub: String(userId),
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "1h",
    }
  );
}

// ======================================================
// OTP HELPERS
// ======================================================

function createOtpExpiry(now: Date): Date {
  return new Date(
    now.getTime() +
      OTP_EXPIRY_MINUTES * 60 * 1000
  );
}

function isCooldownActive(
  lastSentAt: Date
): boolean {
  const cooldownMilliseconds =
    OTP_RESEND_COOLDOWN_SECONDS * 1000;

  return (
    Date.now() - lastSentAt.getTime() <
    cooldownMilliseconds
  );
}

async function createInitialOtp(
  userId: number
): Promise<string> {
  const otp = generateOtp();
  const now = new Date();

  const otpHash = hashOtp(userId, otp);
  const expiresAt = createOtpExpiry(now);

  await prisma.emailVerificationOtp.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      otpHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    },
    update: {
      otpHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    },
  });

  return otp;
}

// ======================================================
// 1. REGISTER
// POST /api/auth/register
// ======================================================

export async function register(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body =
      (req.body ?? {}) as AuthRequestBody;

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

    // Validate name
    const nameError = validateName(name);

    if (nameError) {
      sendError(res, 400, nameError);
      return;
    }

    // Validate email
    const emailError =
      validateEmailInput(email);

    if (emailError) {
      sendError(res, 400, emailError);
      return;
    }

    // Validate password
    const passwordCheck =
      checkPassword(password);

    if (!passwordCheck.valid) {
      sendError(
        res,
        400,
        passwordCheck.message ??
          "Invalid password."
      );
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);

    // Check existing account
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail,
        },
        select: {
          id: true,
        },
      });

    if (existingUser) {
      sendAccountExistsResponse(res);
      return;
    }

    // Hash password
    const passwordHash =
      await bcrypt.hash(
        password,
        PASSWORD_HASH_ROUNDS
      );

    // Create user
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

    // Generate OTP
    const otp = await createInitialOtp(
      user.id
    );

    // Send verification email
    try {
      await sendVerificationEmail(
        cleanEmail,
        otp
      );
    } catch (emailError) {
      console.error(
        "Registration email error:",
        emailError
      );

      sendError(
        res,
        503,
        "Account created, but the verification email could not be delivered. Please request a new code.",
        {
          requiresVerification: true,
        }
      );
      return;
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Account created successfully. Please check your email for the verification code.",
      data: user,
    });
  } catch (error) {
    if (isUniqueError(error)) {
      sendAccountExistsResponse(res);
      return;
    }

    console.error(
      "Registration error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to create account. Please try again later."
    );
  }
}

// ======================================================
// 2. VERIFY EMAIL
// POST /api/auth/verify-email
// ======================================================

export async function verifyEmail(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body =
      (req.body ?? {}) as AuthRequestBody;

    const { email, otp } = body;

    if (
      !isValidEmail(email) ||
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

    const cleanEmail =
      normalizeEmail(email);

    const user =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail,
        },
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
        where: {
          userId: user.id,
        },
      });

    if (
      !challenge ||
      challenge.expiresAt.getTime() <=
        Date.now() ||
      challenge.attempts >=
        OTP_MAX_ATTEMPTS
    ) {
      sendError(
        res,
        400,
        "Invalid or expired verification code. Request a new code."
      );
      return;
    }

    const validOtp = verifyOtpHash(
      user.id,
      otp,
      challenge.otpHash
    );

    if (!validOtp) {
      await prisma.emailVerificationOtp.updateMany({
        where: {
          id: challenge.id,
          otpHash: challenge.otpHash,
          expiresAt: {
            gt: new Date(),
          },
          attempts: {
            lt: OTP_MAX_ATTEMPTS,
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      sendError(
        res,
        400,
        "Invalid or expired verification code."
      );
      return;
    }

    // Verify atomically
    const verified =
      await prisma.$transaction(
        async (tx) => {
          const claimed =
            await tx.emailVerificationOtp.deleteMany({
              where: {
                id: challenge.id,
                userId: user.id,
                otpHash:
                  challenge.otpHash,
                expiresAt: {
                  gt: new Date(),
                },
                attempts: {
                  lt: OTP_MAX_ATTEMPTS,
                },
              },
            });

          if (claimed.count !== 1) {
            return false;
          }

          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              emailVerified: true,
              emailVerifiedAt:
                new Date(),
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

    sendSuccess(
      res,
      200,
      "Email verified successfully. You can now log in."
    );
  } catch (error) {
    console.error(
      "Email verification error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to verify email. Please try again."
    );
  }
}

// ======================================================
// 3. RESEND OTP
// POST /api/auth/resend-otp
// ======================================================

export async function resendOtp(
  req: Request,
  res: Response
): Promise<void> {
  const genericMessage =
    "If the account requires verification, a code will be sent when eligible.";

  try {
    const body =
      (req.body ?? {}) as AuthRequestBody;

    if (!isValidEmail(body.email)) {
      sendError(
        res,
        400,
        "A valid email address is required."
      );
      return;
    }

    const email =
      normalizeEmail(body.email);

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          emailVerified: true,
        },
      });

    if (!user || user.emailVerified) {
      sendSuccess(
        res,
        200,
        genericMessage
      );
      return;
    }

    const existing =
      await prisma.emailVerificationOtp.findUnique({
        where: {
          userId: user.id,
        },
      });

    if (
      existing &&
      isCooldownActive(
        existing.lastSentAt
      )
    ) {
      sendSuccess(
        res,
        200,
        genericMessage
      );
      return;
    }

    const otp = generateOtp();
    const now = new Date();

    const otpHash =
      hashOtp(user.id, otp);

    const expiresAt =
      createOtpExpiry(now);

    const cutoff = new Date(
      now.getTime() -
        OTP_RESEND_COOLDOWN_SECONDS *
          1000
    );

    let claimed = false;

    if (existing) {
      const result =
        await prisma.emailVerificationOtp.updateMany({
          where: {
            userId: user.id,
            lastSentAt: {
              lte: cutoff,
            },
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
      sendSuccess(
        res,
        200,
        genericMessage
      );
      return;
    }

    try {
      await sendVerificationEmail(
        email,
        otp
      );
    } catch (error) {
      console.error(
        "OTP resend email error:",
        error
      );

      sendError(
        res,
        503,
        "Verification email could not be delivered. Please try again later."
      );
      return;
    }

    sendSuccess(
      res,
      200,
      genericMessage
    );
  } catch (error) {
    console.error(
      "OTP resend error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to process the request."
    );
  }
}

// ======================================================
// 4. LOGIN
// POST /api/auth/login
// ======================================================

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body =
      (req.body ?? {}) as AuthRequestBody;

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

    const cleanEmail =
      normalizeEmail(email);

    if (
      !cleanEmail ||
      cleanEmail.length >
        MAX_EMAIL_LENGTH ||
      !password ||
      password.length >
        MAX_PASSWORD_LENGTH
    ) {
      sendError(
        res,
        401,
        "Invalid email or password."
      );
      return;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail,
        },
      });

    if (!user) {
      sendError(
        res,
        401,
        "Invalid email or password."
      );
      return;
    }

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
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
        {
          requiresVerification: true,
        }
      );
      return;
    }

    const token =
      createToken(user.id);

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    sendSuccess(
      res,
      200,
      "Login successful.",
      {
        token,
        user: safeUser,
      }
    );
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to log in. Please try again later."
    );
  }
}

// ======================================================
// 5. GET CURRENT USER
// GET /api/auth/me
// ======================================================

export async function getCurrentUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (userId === null) {
      sendError(
        res,
        401,
        "Authentication required."
      );
      return;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
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

    sendSuccess(
      res,
      200,
      "Account information retrieved.",
      {
        user,
      }
    );
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to retrieve account information."
    );
  }
}

// ======================================================
// 6. UPDATE PROFILE
// PATCH /api/auth/profile
// ======================================================

export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (userId === null) {
      sendError(
        res,
        401,
        "Authentication required."
      );
      return;
    }

    const body =
      (req.body ?? {}) as UpdateProfileBody;

    const nameError =
      validateName(body.name);

    if (nameError) {
      sendError(
        res,
        400,
        nameError
      );
      return;
    }

    const cleanName =
      (body.name as string).trim();

    const updated =
      await prisma.user.updateMany({
        where: {
          id: userId,
          emailVerified: true,
        },
        data: {
          name: cleanName,
        },
      });

    if (updated.count !== 1) {
      sendError(
        res,
        401,
        "Account not found or not verified."
      );
      return;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
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

    sendSuccess(
      res,
      200,
      "Profile updated successfully.",
      {
        user,
      }
    );
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to update profile. Please try again."
    );
  }
}

// ======================================================
// 7. CHANGE PASSWORD
// PATCH /api/auth/change-password
// ======================================================

export async function changePassword(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (userId === null) {
      sendError(
        res,
        401,
        "Authentication required."
      );
      return;
    }

    const body =
      (req.body ?? {}) as ChangePasswordBody;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = body;

    // Validate field types
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      sendError(
        res,
        400,
        "All password fields are required."
      );
      return;
    }

    // Validate current password input
    if (
      !currentPassword ||
      currentPassword.length >
        MAX_PASSWORD_LENGTH
    ) {
      sendError(
        res,
        400,
        "Invalid current password."
      );
      return;
    }

    // Validate confirmation
    if (
      !newPassword ||
      !confirmPassword
    ) {
      sendError(
        res,
        400,
        "New password and confirmation are required."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      sendError(
        res,
        400,
        "New passwords do not match."
      );
      return;
    }

    // Validate password strength
    const passwordCheck =
      checkPassword(newPassword);

    if (!passwordCheck.valid) {
      sendError(
        res,
        400,
        passwordCheck.message ??
          "Invalid new password."
      );
      return;
    }

    // Reject identical passwords
    if (
      currentPassword ===
      newPassword
    ) {
      sendError(
        res,
        400,
        "New password must be different from your current password."
      );
      return;
    }

    // Fetch password hash
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          passwordHash: true,
          emailVerified: true,
        },
      });

    if (
      !user ||
      !user.emailVerified
    ) {
      sendError(
        res,
        401,
        "Account not found or not verified."
      );
      return;
    }

    // Verify current password
    const currentPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

    if (!currentPasswordValid) {
      sendError(
        res,
        400,
        "Current password is incorrect."
      );
      return;
    }

    // Hash new password
    const newPasswordHash =
      await bcrypt.hash(
        newPassword,
        PASSWORD_HASH_ROUNDS
      );

    // Update only if original hash
    // has not changed concurrently.
    const updated =
      await prisma.user.updateMany({
        where: {
          id: userId,
          passwordHash:
            user.passwordHash,
          emailVerified: true,
        },
        data: {
          passwordHash:
            newPasswordHash,
        },
      });

    if (updated.count !== 1) {
      sendError(
        res,
        409,
        "Password was changed in another request. Please try again."
      );
      return;
    }

    sendSuccess(
      res,
      200,
      "Password changed successfully."
    );
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    sendError(
      res,
      500,
      "Unable to change password. Please try again."
    );
  }
}
