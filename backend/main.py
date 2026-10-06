from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from reviewer import review_code
from llm_reviewer import review_with_llm
from github_service import get_repository_files


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="AI Code Review & Release-Risk Assistant",
    version="0.1.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# RISK SCORE
# =========================================================

SEVERITY_SCORE = {
    "Critical": 90,
    "High": 70,
    "Medium": 45,
    "Low": 20,
}


def calculate_risk_score(findings):

    highest_score = 0

    for finding in findings:

        severity = finding.get(
            "severity",
            "",
        )

        score = SEVERITY_SCORE.get(
            severity,
            0,
        )

        highest_score = max(
            highest_score,
            score,
        )

    # Additional findings only add a
    # small amount.
    finding_bonus = min(
        len(findings) * 3,
        10,
    )

    return min(
        highest_score + finding_bonus,
        100,
    )


# =========================================================
# RISK LEVEL + DECISION
# =========================================================

def get_risk_level_and_decision(
    score,
):

    if score <= 30:
        return "LOW", "DEPLOY"

    if score <= 70:
        return "MEDIUM", "MANUAL REVIEW"

    return "HIGH", "BLOCK"


# =========================================================
# REMOVE DUPLICATES
# =========================================================

def remove_duplicate_findings(
    findings,
):

    unique_findings = []

    seen = set()

    for finding in findings:

        key = (
            finding.get("type"),
            finding.get("severity"),
            finding.get("message"),
        )

        if key not in seen:

            seen.add(key)

            unique_findings.append(
                finding
            )

    return unique_findings


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/")
def home():

    return {
        "message": (
            "AI Code Review Backend is running"
        ),
        "status": "success",
    }


# =========================================================
# NORMAL CODE REVIEW
# =========================================================

@app.post("/review")
def review(
    request: dict,
):

    code = request.get(
        "code",
        "",
    )

    if not code.strip():

        return {
            "error": "No code provided.",
        }

    # -----------------------------------------
    # Rule-based analysis
    # -----------------------------------------

    try:

        rule_result = review_code(
            code
        )

    except Exception as error:

        rule_result = {
            "findings": [],
            "error": str(error),
        }

    rule_findings = (
        rule_result.get(
            "findings",
            [],
        )
    )

    # -----------------------------------------
    # Gemini AI analysis
    # -----------------------------------------

    try:

        ai_result = review_with_llm(
            code
        )

    except Exception as error:

        ai_result = {
            "findings": [],
            "summary": (
                f"AI review unavailable: "
                f"{error}"
            ),
        }

    ai_findings = (
        ai_result.get(
            "findings",
            [],
        )
    )

    # -----------------------------------------
    # Combine findings
    # -----------------------------------------

    findings = (
        rule_findings +
        ai_findings
    )

    findings = (
        remove_duplicate_findings(
            findings
        )
    )

    # -----------------------------------------
    # Risk
    # -----------------------------------------

    risk_score = (
        calculate_risk_score(
            findings
        )
    )

    risk_level, decision = (
        get_risk_level_and_decision(
            risk_score
        )
    )

    # -----------------------------------------
    # Response
    # -----------------------------------------

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "decision": decision,
        "findings": findings,
        "ai_summary": ai_result.get(
            "summary",
            "",
        ),
    }


# =========================================================
# GITHUB REPOSITORY REVIEW
# =========================================================

@app.post("/github-review")
def github_review(
    request: dict,
):

    # -----------------------------------------
    # Repository URL
    # -----------------------------------------

    repo_url = request.get(
        "repo_url",
        "",
    )

    if not repo_url.strip():

        return {
            "error": (
                "GitHub repository URL is required."
            )
        }

    # -----------------------------------------
    # Get repository source files
    # -----------------------------------------

    try:

        repository_data = (
            get_repository_files(
                repo_url
            )
        )

    except Exception as error:

        return {
            "error": (
                "GitHub repository review failed: "
                f"{error}"
            )
        }

    files = repository_data.get(
        "files",
        []
    )

    if not files:

        return {
            "error": (
                "No supported source-code "
                "files were found in this repository."
            )
        }

    # -----------------------------------------
    # Rule-based analysis
    # -----------------------------------------

    all_rule_findings = []

    file_results = []

    combined_code_parts = []

    # Maximum code sent to Gemini
    # per source file.
    MAX_AI_CHARS_PER_FILE = 15_000

    for file in files:

        filename = file.get(
            "filename",
            "unknown",
        )

        content = file.get(
            "content",
            "",
        )

        if not content.strip():
            continue

        # =====================================
        # Rule scanner
        # =====================================

        try:

            rule_result = review_code(
                content
            )

        except Exception as error:

            rule_result = {
                "findings": [],
                "error": str(error),
            }

        rule_findings = (
            rule_result.get(
                "findings",
                [],
            )
        )

        all_rule_findings.extend(
            rule_findings
        )

        # =====================================
        # File result
        # =====================================

        file_results.append({
            "filename": filename,
            "size": file.get(
                "size",
                0,
            ),
            "findings": rule_findings,
            "ai_summary": "",
        })

        # =====================================
        # Prepare combined AI input
        # =====================================

        limited_content = content[
            :MAX_AI_CHARS_PER_FILE
        ]

        combined_code_parts.append(
            "\n"
            "=====================================\n"
            f"FILE: {filename}\n"
            "=====================================\n"
            f"{limited_content}\n"
        )

    # -----------------------------------------
    # ONE Gemini request
    # -----------------------------------------

    combined_code = "\n".join(
        combined_code_parts
    )

    ai_findings = []

    ai_summary = ""

    if combined_code.strip():

        try:

            ai_result = review_with_llm(
                combined_code
            )

            ai_findings = (
                ai_result.get(
                    "findings",
                    []
                )
            )

            ai_summary = (
                ai_result.get(
                    "summary",
                    ""
                )
            )

        except Exception as error:

            ai_findings = []

            ai_summary = (
                "AI review unavailable: "
                f"{error}"
            )

    # -----------------------------------------
    # Combine rule + AI findings
    # -----------------------------------------

    all_findings = (
        all_rule_findings +
        ai_findings
    )

    all_findings = (
        remove_duplicate_findings(
            all_findings
        )
    )

    # -----------------------------------------
    # Risk calculation
    # -----------------------------------------

    risk_score = (
        calculate_risk_score(
            all_findings
        )
    )

    risk_level, decision = (
        get_risk_level_and_decision(
            risk_score
        )
    )

    # -----------------------------------------
    # Return result
    # -----------------------------------------

    return {
        "repository": (
            repository_data.get(
                "repository"
            )
        ),

        "default_branch": (
            repository_data.get(
                "default_branch"
            )
        ),

        "files_reviewed": len(
            file_results
        ),

        "risk_score": risk_score,

        "risk_level": risk_level,

        "decision": decision,

        "findings": all_findings,

        "ai_summary": ai_summary,

        "file_results": file_results,
    }