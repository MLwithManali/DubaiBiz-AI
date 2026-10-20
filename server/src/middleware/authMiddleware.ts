
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma.js";

// ==========================================
// TYPES
// ==========================================

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ==========================================
// RESPONSE HELPERS
// ==========================================

function unauthorized(
  res: Response,
  message = "Authentication required. Please log in."
): void {
  res.status(401).json({
    success: false,
    message,
  });
}

function forbidden(
  res: Response,
  message = "You do not have permission to access this resource."
): void {
  res.status(403).json({
    success: false,
    message,
  });
}

// ==========================================
// REQUIRE AUTHENTICATION
// ==========================================

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !/^Bearer\s+\S+$/i.test(authHeader)
  ) {
    unauthorized(res);
    return;
  }

  const token = authHeader
    .replace(/^Bearer\s+/i, "")
    .trim();

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      console.error(
        "JWT_SECRET is missing or insufficiently configured."
      );

      res.status(503).json({
        success: false,
        message: "Authentication service unavailable.",
      });
      return;
    }

    // Verify JWT signature and expiration.
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    // Validate JWT payload.
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !/^[1-9]\d*$/.test(decoded.sub)
    ) {
      unauthorized(
        res,
        "Invalid authentication token."
      );
      return;
    }

    const userId = Number(decoded.sub);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      unauthorized(
        res,
        "Invalid authentication token."
      );
      return;
    }

    // Load current user and role from PostgreSQL.
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      unauthorized(
        res,
        "Your account is no longer available."
      );
      return;
    }

    // Attach authenticated user to request.
    req.user = user;

    next();
  } catch (error) {
    // Expired JWT.
    if (error instanceof jwt.TokenExpiredError) {
      unauthorized(
        res,
        "Your session has expired. Please log in again."
      );
      return;
    }

    // Invalid JWT signature or malformed token.
    if (error instanceof jwt.JsonWebTokenError) {
      unauthorized(
        res,
        "Invalid authentication token."
      );
      return;
    }

    console.error(
      "Authentication error:",
      error
    );

    res.status(503).json({
      success: false,
      message: "Authentication service unavailable.",
    });
  }
}

// ==========================================
// REQUIRE ADMIN ROLE
// Must run AFTER requireAuth.
// ==========================================

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    unauthorized(res);
    return;
  }

  if (req.user.role !== "ADMIN") {
    forbidden(
      res,
      "Administrator access is required."
    );
    return;
  }

  next();
}
