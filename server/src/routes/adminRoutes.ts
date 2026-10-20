
import { Router } from "express";

import {
  getAdminStats,
  getAdminUsers,
} from "../controllers/adminController.js";

import {
  requireAuth,
  requireAdmin,
} from "../middleware/authMiddleware.js";

// ==========================================
// ADMIN ROUTER
// ==========================================

const router = Router();

// ==========================================
// SECURITY
// ==========================================

// All routes below require:
// 1. A valid JWT
// 2. An authenticated user
// 3. The ADMIN role

router.use(requireAuth, requireAdmin);

// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================

// GET /api/admin/stats
router.get("/stats", getAdminStats);

// ==========================================
// REGISTERED USERS
// ==========================================

// GET /api/admin/users?page=1&limit=10
router.get("/users", getAdminUsers);

export default router;
