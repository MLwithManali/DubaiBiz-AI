
import { Router } from "express";

import { classifyLead } from "../controllers/aiController.js";

const router = Router();

// POST /api/ai/classify-lead
router.post("/classify-lead", classifyLead);

export default router;
