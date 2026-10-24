
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  register,
  login,
  verifyEmail,
  resendOtp,
  getCurrentUser,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// ==========================================
// RATE LIMITING
// ==========================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again later.",
  },
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many resend requests. Please try again later.",
  },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many password change attempts. Please try again later.",
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

router.patch(
  "/profile",
  requireAuth,
  updateProfile
);

router.patch(
  "/change-password",
  requireAuth,
  changePasswordLimiter,
  changePassword
);

export default router;
