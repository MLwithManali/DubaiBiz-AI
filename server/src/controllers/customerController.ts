
import type { Response } from "express";
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { validateEmail } from "../utils/emailValidation.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

interface CustomerInput {
  name: string;
  email: string;
  company: string;
  phone: string;
}

// ==========================================
// AUTHENTICATED USER
// ==========================================

function getUserId(
  req: AuthRequest,
  res: Response
): number | null {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
    return null;
  }

  return userId;
}

// ==========================================
// CUSTOMER ID VALIDATION
// ==========================================

function parseCustomerId(
  value: string | string[] | undefined
): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id <= 2147483647
    ? id
    : null;
}

// ==========================================
// CUSTOMER INPUT VALIDATION
// ==========================================

function validateCustomerInput(data: unknown): string {
  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data)
  ) {
    return "Customer information is required.";
  }

  const input = data as Record<string, unknown>;

  if (typeof input.name !== "string") {
    return "Customer name is required.";
  }

  const name = input.name.trim();

  if (name.length < 2 || name.length > 100) {
    return "Customer name must contain 2 to 100 characters.";
  }

  if (!/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(name)) {
    return "Customer name must contain letters only. Numbers are not allowed.";
  }

  if (typeof input.email !== "string") {
    return "Email address is required.";
  }

  const email = input.email.trim().toLowerCase();
  const emailError = validateEmail(email);

  if (emailError) {
    return emailError;
  }

  if (typeof input.company !== "string") {
    return "Company name is required.";
  }

  const company = input.company.trim();

  if (company.length < 2 || company.length > 150) {
    return "Company name must contain 2 to 150 characters.";
  }

  if (typeof input.phone !== "string") {
    return "WhatsApp number is required.";
  }

  const phone = input.phone.trim();

  if (!phone || phone.length > 30 || !isValidPhoneNumber(phone)) {
    return "Enter a valid international WhatsApp number for the selected country.";
  }

  const parsed = parsePhoneNumberFromString(phone);

  if (!parsed) {
    return "Invalid international WhatsApp number.";
  }

  if (
    parsed.country === "IN" &&
    !/^[6-9]\d{9}$/.test(parsed.nationalNumber)
  ) {
    return "Indian WhatsApp mobile numbers must have 10 digits and start with 6, 7, 8 or 9.";
  }

  return "";
}

// ==========================================
// NORMALIZE CUSTOMER DATA
// ==========================================

function normalizeCustomer(data: CustomerInput): CustomerInput {
  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    company: data.company.trim(),
    phone: data.phone.trim(),
  };
}

// ==========================================
// DATABASE ERROR HANDLING
// ==========================================

function handleDatabaseError(
  error: unknown,
  res: Response
): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A customer with this email already exists in your account.",
      });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }
  }

  console.error("Customer database error:", error);

  res.status(500).json({
    success: false,
    message: "An unexpected database error occurred.",
  });
}

// ==========================================
// GET /api/customers
// ==========================================

export const getCustomers = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const customers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
};

// ==========================================
// GET /api/customers/:id
// ==========================================

export const getCustomerById = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const id = parseCustomerId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      message: "Invalid customer ID.",
    });
    return;
  }

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
};

// ==========================================
// POST /api/customers
// ==========================================

export const createCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const validationError = validateCustomerInput(req.body);

  if (validationError) {
    res.status(400).json({
      success: false,
      message: validationError,
    });
    return;
  }

  const input = normalizeCustomer(req.body as CustomerInput);

  try {
    const customer = await prisma.customer.create({
      data: {
        ...input,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customer,
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
};

// ==========================================
// PUT /api/customers/:id
// ==========================================

export const updateCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const id = parseCustomerId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      message: "Invalid customer ID.",
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
      message: "Valid customer information is required.",
    });
    return;
  }

  try {
    const existing = await prisma.customer.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    const updatedData: CustomerInput = {
      name: req.body.name ?? existing.name,
      email: req.body.email ?? existing.email,
      company: req.body.company ?? existing.company,
      phone: req.body.phone ?? existing.phone,
    };

    const validationError = validateCustomerInput(updatedData);

    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    const customer = await prisma.customer.update({
      where: {
        id,
        userId,
      },
      data: normalizeCustomer(updatedData),
    });

    res.json({
      success: true,
      message: "Customer updated successfully.",
      data: customer,
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
};

// ==========================================
// DELETE /api/customers/:id
// ==========================================

export const deleteCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  const id = parseCustomerId(req.params.id);

  if (id === null) {
    res.status(400).json({
      success: false,
      message: "Invalid customer ID.",
    });
    return;
  }

  try {
    await prisma.customer.delete({
      where: {
        id,
        userId,
      },
    });

    res.json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    handleDatabaseError(error, res);
  }
};
