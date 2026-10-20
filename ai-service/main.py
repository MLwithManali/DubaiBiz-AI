
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="DubaiBiz AI - Lead Classification API",
    version="1.0.0",
)


class LeadInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    company: str = Field(min_length=2, max_length=150)
    status: str = "New"
    source: str | None = None
    notes: str | None = None


class LeadPrediction(BaseModel):
    score: int
    priority: str
    explanation: str
    model_type: str = "rule-based-v1"


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "DubaiBiz AI Python service is running.",
    }


@app.post("/predict", response_model=LeadPrediction)
def predict_lead(lead: LeadInput):
    score = 30
    reasons = []

    status_scores = {
        "New": 5,
        "Contacted": 15,
        "Qualified": 35,
        "Won": 40,
        "Lost": -25,
    }

    score += status_scores.get(lead.status, 0)

    if lead.status == "Qualified":
        reasons.append("Lead is already qualified.")
    elif lead.status == "Contacted":
        reasons.append("Initial contact has been made.")
    elif lead.status == "Won":
        reasons.append("Lead is marked as won.")
    elif lead.status == "Lost":
        reasons.append("Lead is marked as lost.")

    source = (lead.source or "").strip().lower()

    if source in {"referral", "website"}:
        score += 10
        reasons.append("Lead source has a positive scoring weight.")
    elif source == "linkedin":
        score += 5
        reasons.append("Lead originated from LinkedIn.")

    notes = (lead.notes or "").lower()

    interest_keywords = (
        "interested",
        "demo",
        "pricing",
        "quotation",
        "purchase",
    )

    if any(word in notes for word in interest_keywords):
        score += 15
        reasons.append("Notes indicate potential buying interest.")

    score = max(0, min(score, 100))

    if lead.status == "Lost":
        priority = "Low"
    elif score >= 70:
        priority = "High"
    elif score >= 40:
        priority = "Medium"
    else:
        priority = "Low"

    explanation = (
        " ".join(reasons)
        if reasons
        else "Priority is based on the initial scoring rules."
    )

    return LeadPrediction(
        score=score,
        priority=priority,
        explanation=explanation,
    )
