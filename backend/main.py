from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from reviewer import review_code


# Create FastAPI application
app = FastAPI(
    title="AI Code Review & Release-Risk Assistant",
    description="Backend API for analyzing source code and calculating release risk.",
    version="1.0.0"
)


# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home route
@app.get("/")
def home():
    return {
        "message": "AI Code Review Backend is running",
        "status": "success"
    }


# Code review API
@app.post("/review")
def review(request: dict):

    # Get code from frontend
    code = request.get("code", "")

    # Check if code was provided
    if not code.strip():
        return {
            "error": "No code provided"
        }

    # Analyze the code
    result = review_code(code)

    # Send result back to frontend
    return result