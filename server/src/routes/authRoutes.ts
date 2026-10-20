
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  register,
  login,
  verifyEmail,
  resendOtp,
  getCurrentUser,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// ==========================================
// RATE LIMITING
// ==========================================

// Login: maximum 10 requests per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many login attempts. Please try again later.",
  },
});

// Registration: maximum 5 requests per hour.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many registration attempts. Please try again later.",
  },
});

// OTP verification: maximum 10 requests per 15 minutes.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many verification attempts. Please try again later.",
  },
});

// OTP resend: maximum 5 requests per 15 minutes.
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many resend requests. Please try again later.",
  },
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.post(
  "/register",
  registerLimiter,
  register
);

router.post(
  "/login",
  loginLimiter,
  login
);

router.post(
  "/verify-email",
  verifyLimiter,
  verifyEmail
);

router.post(
  "/resend-otp",
  resendLimiter,
  resendOtp
);

// ==========================================
// PROTECTED ROUTES
// ==========================================

router.get(
  "/me",
  requireAuth,
  getCurrentUser
);

export default router;
