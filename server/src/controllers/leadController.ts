
import type { Response } from "express";
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { validateEmail } from "../utils/emailValidation.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

// ==========================================
// LEAD CONFIGURATION
// ==========================================

const VALID_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Won",
  "Lost",
] as const;

const VALID_PRIORITIES = [
  "Low",
  "Medium",
  "High",
] as const;

type LeadStatus = (typeof VALID_STATUSES)[number];
type LeadPriority = (typeof VALID_PRIORITIES)[number];

interface LeadInput {
  name: string;
  email: string;
  company: string;
  phone: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: string | null;
  notes: string | null;
}

type ValidationResult =
  | { error: string; data?: never }
  | { error?: never; data: LeadInput };

// ==========================================
// AUTHENTICATION
// ==========================================

function getUserId(
  req: AuthRequest,
  res: Response
): number | null {
  const userId = req.user?.id;

  if (
    !Number.isSafeInteger(userId) ||
    userId === undefined ||
    userId <= 0
  ) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });

    return null;
  }

  return userId;
}

// ==========================================
// VALIDATE LEAD ID
// ==========================================

function parseLeadId(
  value: string | string[] | undefined
): number | null {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }

  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id > 2147483647
  ) {
    return null;
  }

  return id;
}

// ==========================================
// VALIDATE LEAD INFORMATION
// ==========================================

function validateLead(
  body: unknown
): ValidationResult {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return {
      error: "Valid lead information is required.",
    };
  }

  const input = body as Record<string, unknown>;

  // NAME
  if (typeof input.name !== "string") {
    return {
      error: "Lead name is required.",
    };
  }

  const name = input.name.trim();

  if (name.length < 2 || name.length > 100) {
    return {
      error: "Lead name must contain 2 to 100 characters.",
    };
  }

  const namePattern =
    /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u;

  if (!namePattern.test(name)) {
    return {
      error:
        "Lead name must contain letters only. Numbers are not allowed.",
    };
  }

  // EMAIL
  if (typeof input.email !== "string") {
    return {
      error: "Email address is required.",
    };
  }

  const email = input.email.trim().toLowerCase();
  const emailError = validateEmail(email);

  if (emailError) {
    return {
      error: emailError,
    };
  }

  // COMPANY
  if (typeof input.company !== "string") {
    return {
      error: "Company name is required.",
    };
  }

  const company = input.company.trim();

  if (
    company.length < 2 ||
    company.length > 150
  ) {
    return {
      error: "Company name must contain 2 to 150 characters.",
    };
  }

  // OPTIONAL PHONE
  if (
    input.phone !== undefined &&
    input.phone !== null &&
    typeof input.phone !== "string"
  ) {
    return {
      error: "Phone number must be text.",
    };
  }

  const phone =
    typeof input.phone === "string"
      ? input.phone.trim()
      : "";

  if (phone) {
    if (
      phone.length > 30 ||
      !isValidPhoneNumber(phone)
    ) {
      return {
        error:
          "Enter a valid international phone number for the selected country.",
      };
    }

    const parsed =
      parsePhoneNumberFromString(phone);

    if (!parsed) {
      return {
        error: "Invalid international phone number.",
      };
    }

    if (
      parsed.country === "IN" &&
      !/^[6-9]\d{9}$/.test(parsed.nationalNumber)
    ) {
      return {
        error:
          "Indian mobile numbers must contain 10 digits and start with 6, 7, 8 or 9.",
      };
    }
  }

  // STATUS
  const status =
    input.status === undefined
      ? "New"
      : input.status;

  if (
    typeof status !== "string" ||
    !VALID_STATUSES.some(
      (value) => value === status
    )
  ) {
    return {
      error:
        "Status must be New, Contacted, Qualified, Won or Lost.",
    };
  }

  // PRIORITY
  const priority =
    input.priority === undefined
      ? "Medium"
      : input.priority;

  if (
    typeof priority !== "string" ||
    !VALID_PRIORITIES.some(
      (value) => value === priority
    )
  ) {
    return {
      error:
        "Priority must be Low, Medium or High.",
    };
  }

  // OPTIONAL SOURCE
  if (
    input.source !== undefined &&
    input.source !== null &&
    typeof input.source !== "string"
  ) {
    return {
      error: "Lead source must be text.",
    };
  }

  const source =
    typeof input.source === "string"
      ? input.source.trim()
      : "";

  if (source.length > 100) {
    return {
      error:
        "Lead source must be 100 characters or less.",
    };
  }

  // OPTIONAL NOTES
  if (
    input.notes !== undefined &&
    input.notes !== null &&
    typeof input.notes !== "string"
  ) {
    return {
      error: "Notes must be text.",
    };
  }

  const notes =
    typeof input.notes === "string"
      ? input.notes.trim()
      : "";

  if (notes.length > 2000) {
    return {
      error:
        "Notes must be 2000 characters or less.",
    };
  }

  // NORMALIZED DATA
  return {
    data: {
      name,
      email,
      company,
      phone: phone || null,
      status: status as LeadStatus,
      priority: priority as LeadPriority,
      source: source || null,
      notes: notes || null,
    },
  };
}

// ==========================================
// DATABASE ERROR HANDLING
// ==========================================

function handleLeadError(
  error: unknown,
  res: Response
): void {
  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    res.status(404).json({
      success: false,
      message: "Lead not found.",
    });
    return;
  }

  console.error("Lead database error:", error);

  res.status(500).json({
    success: false,
    message:
      "An unexpected database error occurred.",
  });
}

// ==========================================
// GET ALL LEADS
// GET /api/leads
// ==========================================

export async function getLeads(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const leads = await prisma.lead.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: leads,
    });
  } catch (error) {
    handleLeadError(error, res);
  }
}

// ==========================================
// GET SINGLE LEAD
// GET /api/leads/:id
// ==========================================

export async function getLeadById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const id = parseLeadId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      message: "Invalid lead ID.",
    });
    return;
  }

  try {
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    handleLeadError(error, res);
  }
}

// ==========================================
// CREATE LEAD
// POST /api/leads
// ==========================================

export async function createLead(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const validation = validateLead(req.body);

  if (!validation.data) {
    res.status(400).json({
      success: false,
      message: validation.error,
    });
    return;
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        ...validation.data,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Lead created successfully.",
      data: lead,
    });
  } catch (error) {
    handleLeadError(error, res);
  }
}

// ==========================================
// UPDATE LEAD
// PUT /api/leads/:id
// ==========================================

export async function updateLead(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const id = parseLeadId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      message: "Invalid lead ID.",
    });
    return;
  }

  if (
    typeof req.body !== "object" ||
    req.body === null ||
    Array.isArray(req.body)
  ) {
    res.status(400).json({
      success: false,
      message: "Valid lead information is required.",
    });
    return;
  }

  try {
    const existing = await prisma.lead.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
      return;
    }

    // Preserve fields omitted from the request
    const updatedInput = {
      name: req.body.name ?? existing.name,
      email: req.body.email ?? existing.email,
      company: req.body.company ?? existing.company,

      phone:
        req.body.phone !== undefined
          ? req.body.phone
          : existing.phone,

      status:
        req.body.status ?? existing.status,

      priority:
        req.body.priority ?? existing.priority,

      source:
        req.body.source !== undefined
          ? req.body.source
          : existing.source,

      notes:
        req.body.notes !== undefined
          ? req.body.notes
          : existing.notes,
    };

    const validation = validateLead(updatedInput);

    if (!validation.data) {
      res.status(400).json({
        success: false,
        message: validation.error,
      });
      return;
    }

    const lead = await prisma.lead.update({
      where: {
        id,
        userId,
      },
      data: validation.data,
    });

    res.status(200).json({
      success: true,
      message: "Lead updated successfully.",
      data: lead,
    });
  } catch (error) {
    handleLeadError(error, res);
  }
}

// ==========================================
// DELETE LEAD
// DELETE /api/leads/:id
// ==========================================

export async function deleteLead(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const id = parseLeadId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      message: "Invalid lead ID.",
    });
    return;
  }

  try {
    await prisma.lead.delete({
      where: {
        id,
        userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    handleLeadError(error, res);
  }
}
