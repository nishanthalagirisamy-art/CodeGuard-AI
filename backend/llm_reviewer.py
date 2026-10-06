import json

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    http_options=types.HttpOptions(
        timeout=30000,
        retry_options=types.HttpRetryOptions(
            attempts=1
        )
    )
)


def review_with_llm(code: str):
    prompt = f"""
You are an expert software security and code review assistant.

Analyze this source code for:
1. Bugs
2. Security vulnerabilities
3. Code quality problems
4. Deployment or release risks

For important issues, provide:
- type
- severity
- message
- recommendation

Severity must be one of:
Critical, High, Medium, Low

Return only valid JSON:

{{
  "findings": [
    {{
      "type": "Security",
      "severity": "High",
      "message": "Explain the issue clearly",
      "recommendation": "Explain how to fix it"
    }}
  ],
  "summary": "Short overall assessment"
}}

Source code:

{code}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            )
        )
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {
            "findings": [],
            "summary": response.text
        }