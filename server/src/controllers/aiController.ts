
import type { Request, Response } from "express";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

type LeadInput = {
  name: string;
  company: string;
  status?: string;
  source?: string | null;
  notes?: string | null;
};

type LeadPrediction = {
  score: number;
  priority: "Low" | "Medium" | "High";
  explanation: string;
  model_type: string;
};

export async function classifyLead(
  req: Request,
  res: Response
): Promise<void> {
  const { name, company, status, source, notes } =
    req.body ?? {};

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    typeof company !== "string" ||
    company.trim().length < 2
  ) {
    res.status(400).json({
      success: false,
      message: "Valid lead name and company are required.",
    });
    return;
  }

  const lead: LeadInput = {
    name: name.trim(),
    company: company.trim(),
    status: typeof status === "string" ? status : "New",
    source: typeof source === "string" ? source : null,
    notes: typeof notes === "string" ? notes : null,
  };

  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(
        "AI service returned:",
        response.status
      );

      res.status(502).json({
        success: false,
        message: "AI service could not process this lead.",
      });
      return;
    }

    const prediction =
      (await response.json()) as LeadPrediction;

    if (
      typeof prediction.score !== "number" ||
      !Number.isFinite(prediction.score) ||
      prediction.score < 0 ||
      prediction.score > 100 ||
      !["Low", "Medium", "High"].includes(
        prediction.priority
      ) ||
      typeof prediction.explanation !== "string" ||
      typeof prediction.model_type !== "string"
    ) {
      res.status(502).json({
        success: false,
        message: "AI service returned an invalid response.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Lead classification completed.",
      data: prediction,
    });
  } catch (error) {
    console.error("AI classification error:", error);

    res.status(503).json({
      success: false,
      message:
        "AI service is unavailable. Please try again.",
    });
  }
}
