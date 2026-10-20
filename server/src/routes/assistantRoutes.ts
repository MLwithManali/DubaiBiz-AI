
import { Router } from "express";

import {
  chatWithAssistant,
} from "../controllers/assistantController.js";

const router = Router();

// POST /api/assistant/chat
router.post("/chat", chatWithAssistant);

export default router;
