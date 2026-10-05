from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from reviewer import review_code
from llm_reviewer import review_with_llm

app = FastAPI(
    title="AI Code Review & Release-Risk Assistant"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "AI Code Review Backend is running",
        "status": "success"
    }


@app.post("/review")
def review(request: dict):
    code = request.get("code", "")

    if not code:
        return {
            "error": "No code provided"
        }

    # Existing rule-based review
    rule_result = review_code(code)

    # Gemini AI review
    try:
        ai_result = review_with_llm(code)
    except Exception as error:
        ai_result = {
            "findings": [],
            "summary": f"AI review unavailable: {str(error)}"
        }

    # Combine findings
    combined_findings = rule_result["findings"].copy()

    for finding in ai_result.get("findings", []):
        combined_findings.append(finding)

    # Remove exact duplicate findings
    unique_findings = []
    seen = set()

    for finding in combined_findings:
        key = (
            finding.get("type"),
            finding.get("severity"),
            finding.get("message")
        )

        if key not in seen:
            seen.add(key)
            unique_findings.append(finding)

    # Calculate additional AI risk
    severity_score = {
        "Critical": 30,
        "High": 20,
        "Medium": 10,
        "Low": 5
    }

    ai_score = sum(
        severity_score.get(
            finding.get("severity"),
            0
        )
        for finding in ai_result.get("findings", [])
    )

    final_score = min(
        rule_result["risk_score"] + ai_score,
        100
    )

    if final_score <= 30:
        risk_level = "LOW"
        decision = "DEPLOY"
    elif final_score <= 70:
        risk_level = "MEDIUM"
        decision = "MANUAL REVIEW"
    else:
        risk_level = "HIGH"
        decision = "BLOCK"

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "decision": decision,
        "findings": unique_findings,
        "ai_summary": ai_result.get("summary", "")
    }