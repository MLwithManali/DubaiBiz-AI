
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

// ==========================================
// ADMIN DASHBOARD STATISTICS
// GET /api/admin/stats
// ==========================================

export async function getAdminStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Administrator access required.",
      });
      return;
    }

    const [
      totalUsers,
      totalCustomers,
      totalLeads,
      verifiedUsers,
      adminUsers,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.lead.count(),
      prisma.user.count({
        where: { emailVerified: true },
      }),
      prisma.user.count({
        where: { role: "ADMIN" },
      }),
      prisma.lead.count({
        where: { status: "New" },
      }),
      prisma.lead.count({
        where: { status: "Contacted" },
      }),
      prisma.lead.count({
        where: { status: "Qualified" },
      }),
      prisma.lead.count({
        where: { status: "Won" },
      }),
      prisma.lead.count({
        where: { status: "Lost" },
      }),
    ]);

    const conversionRate =
      totalLeads === 0
        ? 0
        : Number(
            ((wonLeads / totalLeads) * 100).toFixed(1)
          );

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCustomers,
        totalLeads,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        adminUsers,
        conversionRate,
        leadStatuses: {
          New: newLeads,
          Contacted: contactedLeads,
          Qualified: qualifiedLeads,
          Won: wonLeads,
          Lost: lostLeads,
        },
      },
    });
  } catch (error) {
    console.error("Admin statistics error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load admin statistics.",
    });
  }
}

// ==========================================
// LIST REGISTERED USERS
// GET /api/admin/users?page=1&limit=10
// ==========================================

export async function getAdminUsers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Administrator access required.",
      });
      return;
    }

    const pageInput = Number(req.query.page ?? 1);
    const limitInput = Number(req.query.limit ?? 10);

    if (
      !Number.isSafeInteger(pageInput) ||
      pageInput < 1 ||
      !Number.isSafeInteger(limitInput) ||
      limitInput < 1 ||
      limitInput > 100
    ) {
      res.status(400).json({
        success: false,
        message:
          "Page must be a positive integer and limit must be between 1 and 100.",
      });
      return;
    }

    const page = pageInput;
    const limit = limitInput;
    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      res.status(400).json({
        success: false,
        message: "Invalid pagination range.",
      });
      return;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: {
              customers: true,
              leads: true,
            },
          },
        },
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load registered users.",
    });
  }
}
