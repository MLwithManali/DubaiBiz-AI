
import { Router } from "express";

import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
} from "../controllers/leadController.js";

const router = Router();

// ==========================================
// LEADS MANAGEMENT API ROUTES
// ==========================================

// GET - Fetch all leads
router.get("/", getLeads);

// GET - Fetch a single lead by ID
router.get("/:id", getLeadById);

// POST - Create a new lead
router.post("/", createLead);

// PUT - Update an existing lead
router.put("/:id", updateLead);

// DELETE - Delete a lead
router.delete("/:id", deleteLead);

export default router;
