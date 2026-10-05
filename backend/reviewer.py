import re

def review_code(code: str):
    findings = []
    score = 0

    if re.search(r"(api[_-]?key|password|secret)\s*=\s*['\"].+['\"]", code, re.I):
        findings.append({
            "type": "Security",
            "severity": "Critical",
            "message": "Possible hardcoded secret detected."
        })
        score += 30

    if re.search(r"(SELECT|INSERT|UPDATE|DELETE).*(\+|f['\"])", code, re.I):
        findings.append({
            "type": "Security",
            "severity": "High",
            "message": "Possible SQL injection risk detected."
        })
        score += 25

    if "eval(" in code:
        findings.append({
            "type": "Security",
            "severity": "High",
            "message": "Use of eval() can execute unsafe code."
        })
        score += 20

    if "TODO" in code:
        findings.append({
            "type": "Code Quality",
            "severity": "Medium",
            "message": "TODO item found in the submitted code."
        })
        score += 5

    score = min(score, 100)

    if score <= 30:
        risk = "LOW"
        decision = "DEPLOY"
    elif score <= 70:
        risk = "MEDIUM"
        decision = "MANUAL REVIEW"
    else:
        risk = "HIGH"
        decision = "BLOCK"

    return {
        "risk_score": score,
        "risk_level": risk,
        "decision": decision,
        "findings": findings
    }