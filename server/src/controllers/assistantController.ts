
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

// ==========================================
// TYPES
// ==========================================

type AssistantIntent =
  | "customer_count"
  | "lead_count"
  | "qualified_leads"
  | "high_priority_leads"
  | "conversion_rate"
  | "crm_summary"
  | "help";

interface AssistantAnswer {
  reply: string;
  intent: AssistantIntent;
}

// ==========================================
// AUTHENTICATED USER
// ==========================================

function getUserId(
  req: AuthRequest,
  res: Response
): number | null {
  const userId = req.user?.id;

  if (
    typeof userId !== "number" ||
    !Number.isSafeInteger(userId) ||
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
// DETECT QUESTION INTENT
// ==========================================

function detectIntent(message: string): AssistantIntent {
  const text = message.toLowerCase().trim();

  if (
    text.includes("summarize") ||
    text.includes("summary") ||
    text.includes("overview")
  ) {
    return "crm_summary";
  }

  if (
    text.includes("conversion") ||
    text.includes("converted")
  ) {
    return "conversion_rate";
  }

  if (text.includes("qualified")) {
    return "qualified_leads";
  }

  if (
    text.includes("high priority") ||
    text.includes("high-priority")
  ) {
    return "high_priority_leads";
  }

  if (
    text.includes("customer") ||
    text.includes("clients")
  ) {
    return "customer_count";
  }

  if (
    text.includes("lead") ||
    text.includes("opportunities")
  ) {
    return "lead_count";
  }

  return "help";
}

// ==========================================
// GENERATE USER-SPECIFIC CRM ANSWERS
// ==========================================

async function generateAnswer(
  intent: AssistantIntent,
  userId: number
): Promise<AssistantAnswer> {
  switch (intent) {
    // ======================================
    // CUSTOMER COUNT
    // ======================================

    case "customer_count": {
      const count = await prisma.customer.count({
        where: { userId },
      });

      return {
        intent,
        reply:
          `You currently have ${count} customer` +
          `${count === 1 ? "" : "s"} in your CRM.`,
      };
    }

    // ======================================
    // LEAD COUNT
    // ======================================

    case "lead_count": {
      const count = await prisma.lead.count({
        where: { userId },
      });

      return {
        intent,
        reply:
          `You currently have ${count} lead` +
          `${count === 1 ? "" : "s"} in your CRM.`,
      };
    }

    // ======================================
    // QUALIFIED LEADS
    // ======================================

    case "qualified_leads": {
      const where = {
        userId,
        status: "Qualified" as const,
      };

      const [total, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          select: {
            name: true,
            company: true,
            priority: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        }),
      ]);

      if (total === 0) {
        return {
          intent,
          reply: "You currently have no qualified leads.",
        };
      }

      const details = leads
        .map(
          (lead, index) =>
            `${index + 1}. ${lead.name} — ${lead.company} (${lead.priority} priority)`
        )
        .join("\n");

      return {
        intent,
        reply:
          `You have ${total} qualified lead(s).\n\n` +
          details +
          (total > leads.length
            ? `\n\nShowing the latest ${leads.length} leads.`
            : ""),
      };
    }

    // ======================================
    // HIGH PRIORITY LEADS
    // ======================================

    case "high_priority_leads": {
      const where = {
        userId,
        priority: "High",
      };

      const [total, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          select: {
            name: true,
            company: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        }),
      ]);

      if (total === 0) {
        return {
          intent,
          reply: "You currently have no high-priority leads.",
        };
      }

      const details = leads
        .map(
          (lead, index) =>
            `${index + 1}. ${lead.name} — ${lead.company} (${lead.status})`
        )
        .join("\n");

      return {
        intent,
        reply:
          `You have ${total} high-priority lead(s).\n\n` +
          details +
          (total > leads.length
            ? `\n\nShowing the latest ${leads.length} leads.`
            : ""),
      };
    }

    // ======================================
    // CONVERSION RATE
    // ======================================

    case "conversion_rate": {
      const [total, won] = await Promise.all([
        prisma.lead.count({
          where: { userId },
        }),
        prisma.lead.count({
          where: {
            userId,
            status: "Won",
          },
        }),
      ]);

      const rate =
        total === 0 ? 0 : (won / total) * 100;

      return {
        intent,
        reply:
          `Your lead conversion rate is ${rate.toFixed(1)}%.\n\n` +
          `Total leads: ${total}\n` +
          `Won leads: ${won}\n\n` +
          `Calculation: (Won Leads / Total Leads) × 100`,
      };
    }

    // ======================================
    // CRM SUMMARY
    // ======================================

    case "crm_summary": {
      const [
        customers,
        totalLeads,
        newLeads,
        contactedLeads,
        qualifiedLeads,
        wonLeads,
        lostLeads,
        highPriorityLeads,
      ] = await Promise.all([
        prisma.customer.count({
          where: { userId },
        }),

        prisma.lead.count({
          where: { userId },
        }),

        prisma.lead.count({
          where: {
            userId,
            status: "New",
          },
        }),

        prisma.lead.count({
          where: {
            userId,
            status: "Contacted",
          },
        }),

        prisma.lead.count({
          where: {
            userId,
            status: "Qualified",
          },
        }),

        prisma.lead.count({
          where: {
            userId,
            status: "Won",
          },
        }),

        prisma.lead.count({
          where: {
            userId,
            status: "Lost",
          },
        }),

        prisma.lead.count({
          where: {
            userId,
            priority: "High",
          },
        }),
      ]);

      const conversionRate =
        totalLeads === 0
          ? 0
          : (wonLeads / totalLeads) * 100;

      return {
        intent,
        reply:
          `DubaiBiz AI — CRM Summary\n\n` +
          `Total Customers: ${customers}\n` +
          `Total Leads: ${totalLeads}\n\n` +
          `Lead Status:\n` +
          `• New: ${newLeads}\n` +
          `• Contacted: ${contactedLeads}\n` +
          `• Qualified: ${qualifiedLeads}\n` +
          `• Won: ${wonLeads}\n` +
          `• Lost: ${lostLeads}\n\n` +
          `High-Priority Leads: ${highPriorityLeads}\n` +
          `Conversion Rate: ${conversionRate.toFixed(1)}%`,
      };
    }

    // ======================================
    // UNSUPPORTED QUESTIONS
    // ======================================

    default:
      return {
        intent: "help",
        reply:
          "I can help you with your CRM data.\n\n" +
          "Try asking:\n" +
          "• How many customers do I have?\n" +
          "• How many leads do I have?\n" +
          "• Show my qualified leads\n" +
          "• How many high priority leads?\n" +
          "• What is my lead conversion rate?\n" +
          "• Summarize my CRM\n\n" +
          "This version supports predefined CRM questions.",
      };
  }
}

// ==========================================
// CHAT CONTROLLER
// POST /api/assistant/chat
// ==========================================

export async function chatWithAssistant(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = getUserId(req, res);

  if (userId === null) {
    return;
  }

  try {
    const { message } = req.body ?? {};

    if (
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Please enter a question.",
      });
      return;
    }

    if (message.length > 500) {
      res.status(400).json({
        success: false,
        message: "Question must be 500 characters or fewer.",
      });
      return;
    }

    const intent = detectIntent(message);

    const answer = await generateAnswer(
      intent,
      userId
    );

    res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    console.error("CRM Assistant error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process your CRM question.",
    });
  }
}
