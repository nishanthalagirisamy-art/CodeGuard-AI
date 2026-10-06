import base64
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------------
# GitHub configuration
# ---------------------------------------------------------

GITHUB_API = "https://api.github.com"

MAX_FILES = 20
MAX_FILE_SIZE = 200_000

CODE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".swift",
    ".kt",
    ".kts",
    ".html",
    ".css",
    ".scss",
    ".sql",
    ".sh",
    ".yaml",
    ".yml",
    ".json",
}


IGNORED_PATH_PARTS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    "coverage",
    ".next",
    ".idea",
    ".vscode",
}


# ---------------------------------------------------------
# Headers
# ---------------------------------------------------------

def get_headers():
    token = os.getenv("GITHUB_TOKEN")

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    return headers


# ---------------------------------------------------------
# Parse repository URL
# ---------------------------------------------------------

def parse_github_url(repo_url: str):
    repo_url = repo_url.strip()

    if not repo_url:
        raise ValueError(
            "GitHub repository URL is required."
        )

    if not re.match(r"^https?://", repo_url):
        repo_url = "https://" + repo_url

    pattern = r"https?://github\.com/([^/]+)/([^/#?]+)"

    match = re.match(pattern, repo_url)

    if not match:
        raise ValueError(
            "Invalid GitHub repository URL."
        )

    owner = match.group(1)
    repo = match.group(2)

    repo = repo.replace(".git", "")

    return owner, repo


# ---------------------------------------------------------
# GitHub API request helper
# ---------------------------------------------------------

def github_get(url: str):
    try:
        response = requests.get(
            url,
            headers=get_headers(),
            timeout=30,
        )
    except requests.RequestException as error:
        raise ValueError(
            f"Could not connect to GitHub: {error}"
        )

    if response.status_code == 401:
        raise ValueError(
            "GitHub authentication failed. "
            "Check your GITHUB_TOKEN."
        )

    if response.status_code == 403:
        raise ValueError(
            "GitHub rejected the request with 403. "
            "Check your token permissions or API rate limit."
        )

    if response.status_code == 404:
        raise ValueError(
            "Repository not found or you do not have access to it."
        )

    response.raise_for_status()

    return response.json()


# ---------------------------------------------------------
# Get repository information
# ---------------------------------------------------------

def get_repository_info(owner: str, repo: str):
    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}"
    )

    return github_get(url)


# ---------------------------------------------------------
# Get repository tree
# ---------------------------------------------------------

def get_repository_tree(
    owner: str,
    repo: str,
    branch: str
):
    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}/git/trees/"
        f"{branch}?recursive=1"
    )

    data = github_get(url)

    if data.get("truncated"):
        raise ValueError(
            "The repository is too large for one recursive tree request."
        )

    return data.get("tree", [])


# ---------------------------------------------------------
# Check whether path should be ignored
# ---------------------------------------------------------

def should_ignore_path(path: str):
    parts = path.split("/")

    for part in parts:
        if part in IGNORED_PATH_PARTS:
            return True

    return False


# ---------------------------------------------------------
# Check code file
# ---------------------------------------------------------

def is_code_file(path: str):
    path_lower = path.lower()

    for extension in CODE_EXTENSIONS:
        if path_lower.endswith(extension):
            return True

    return False


# ---------------------------------------------------------
# Get file contents from GitHub blob API
# ---------------------------------------------------------

def get_file_content(owner: str, repo: str, sha: str):
    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}/git/blobs/{sha}"
    )

    data = github_get(url)

    encoding = data.get("encoding")

    if encoding != "base64":
        return ""

    content = data.get("content", "")

    try:
        decoded = base64.b64decode(
            content
        ).decode(
            "utf-8",
            errors="replace"
        )

        return decoded

    except Exception:
        return ""


# ---------------------------------------------------------
# Main repository analysis fetcher
# ---------------------------------------------------------

def get_repository_files(repo_url: str):
    owner, repo = parse_github_url(
        repo_url
    )

    # -----------------------------------------
    # Repository information
    # -----------------------------------------

    repository = get_repository_info(
        owner,
        repo
    )

    default_branch = repository.get(
        "default_branch"
    )

    if not default_branch:
        raise ValueError(
            "Could not determine the repository's default branch."
        )

    # -----------------------------------------
    # Repository tree
    # -----------------------------------------

    tree = get_repository_tree(
        owner,
        repo,
        default_branch
    )

    files = []

    # -----------------------------------------
    # Select source files
    # -----------------------------------------

    for item in tree:

        if item.get("type") != "blob":
            continue

        path = item.get(
            "path",
            ""
        )

        size = item.get(
            "size",
            0
        )

        if should_ignore_path(path):
            continue

        if not is_code_file(path):
            continue

        if size > MAX_FILE_SIZE:
            continue

        files.append({
            "path": path,
            "sha": item.get("sha"),
            "size": size,
        })

        if len(files) >= MAX_FILES:
            break

    # -----------------------------------------
    # Download file contents
    # -----------------------------------------

    results = []

    for file in files:

        content = get_file_content(
            owner,
            repo,
            file["sha"]
        )

        results.append({
            "filename": file["path"],
            "size": file["size"],
            "content": content,
        })

    return {
        "repository": f"{owner}/{repo}",
        "default_branch": default_branch,
        "files": results,
    }