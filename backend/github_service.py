import io
import os
import re
import zipfile

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib.parse import quote
from urllib3.util.retry import Retry


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()


# =========================================================
# CONFIGURATION
# =========================================================

GITHUB_API = "https://api.github.com"

# Maximum number of files reviewed
MAX_FILES = 8

# Maximum size of one source file
MAX_FILE_SIZE = 100_000

# Maximum repository ZIP size
MAX_ARCHIVE_SIZE = 75 * 1024 * 1024


# =========================================================
# SUPPORTED FILE TYPES
# =========================================================

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


# =========================================================
# IGNORED FOLDERS
# =========================================================

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


# =========================================================
# HTTP SESSION
# =========================================================

def create_session():
    retry_strategy = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1,
        status_forcelist=[
            429,
            500,
            502,
            503,
            504,
        ],
        allowed_methods=[
            "GET",
        ],
        respect_retry_after_header=True,
    )

    adapter = HTTPAdapter(
        max_retries=retry_strategy
    )

    session = requests.Session()

    session.mount(
        "https://",
        adapter
    )

    session.mount(
        "http://",
        adapter
    )

    return session


session = create_session()


# =========================================================
# GITHUB HEADERS
# =========================================================

def get_headers():
    token = os.getenv("GITHUB_TOKEN")

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "CodeGuard-AI",
    }

    if token:
        headers["Authorization"] = (
            f"Bearer {token}"
        )

    return headers


# =========================================================
# PARSE GITHUB URL
# =========================================================

def parse_github_url(repo_url: str):
    """
    Accepts URLs such as:

    https://github.com/user/repo
    https://github.com/user/repo.git
    https://github.com/user/repo/tree/main
    https://github.com/user/repo/blob/main/file.py
    https://github.com/user/repo/pull/12

    Only the owner/repository part is used.
    """

    repo_url = repo_url.strip()

    if not repo_url:
        raise ValueError(
            "GitHub repository URL is required."
        )

    # Allow users to omit https://
    if not re.match(
        r"^https?://",
        repo_url,
        flags=re.IGNORECASE,
    ):
        repo_url = (
            "https://" + repo_url
        )

    match = re.match(
        r"^https?://"
        r"(?:www\.)?"
        r"github\.com/"
        r"([^/]+)/"
        r"([^/#?]+)",
        repo_url,
        flags=re.IGNORECASE,
    )

    if not match:
        raise ValueError(
            "Invalid GitHub repository URL."
        )

    owner = match.group(1)
    repo = match.group(2)

    repo = re.sub(
        r"\.git$",
        "",
        repo,
        flags=re.IGNORECASE,
    )

    if not owner or not repo:
        raise ValueError(
            "Invalid GitHub repository URL."
        )

    return owner, repo


# =========================================================
# GITHUB GET REQUEST
# =========================================================

def github_get(url: str):

    try:
        response = session.get(
            url,
            headers=get_headers(),
            timeout=(10, 45),
        )

    except requests.RequestException as error:
        raise ValueError(
            "Could not connect to GitHub: "
            f"{error}"
        )

    if response.status_code == 401:
        raise ValueError(
            "GitHub authentication failed. "
            "Check GITHUB_TOKEN."
        )

    if response.status_code == 403:
        raise ValueError(
            "GitHub returned 403. "
            "Check token permissions or API rate limits."
        )

    if response.status_code == 404:
        raise ValueError(
            "Repository not found or you do not "
            "have access to it."
        )

    try:
        response.raise_for_status()

    except requests.HTTPError as error:
        raise ValueError(
            f"GitHub API error "
            f"({response.status_code}): {error}"
        )

    return response.json()


# =========================================================
# GET REPOSITORY INFORMATION
# =========================================================

def get_repository_info(
    owner: str,
    repo: str,
):
    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}"
    )

    return github_get(url)


# =========================================================
# CHECK SOURCE FILE
# =========================================================

def is_code_file(path: str):
    path_lower = path.lower()

    return any(
        path_lower.endswith(extension)
        for extension in CODE_EXTENSIONS
    )


# =========================================================
# IGNORE UNWANTED PATHS
# =========================================================

def should_ignore_path(path: str):
    parts = path.split("/")

    for part in parts:
        if part in IGNORED_PATH_PARTS:
            return True

    return False


# =========================================================
# FILE PRIORITY
# =========================================================

def get_file_priority(path: str):
    """
    Lower number = higher priority.

    Priority 1:
        Actual application source code

    Priority 2:
        SQL / HTML / CSS

    Priority 3:
        Configuration

    Priority 4:
        Other supported files
    """

    path_lower = path.lower()

    # -----------------------------------------------------
    # Highest priority: actual application source code
    # -----------------------------------------------------

    if path_lower.endswith((
        ".py",
        ".jsx",
        ".tsx",
        ".js",
        ".ts",
        ".java",
        ".c",
        ".cpp",
        ".cs",
        ".go",
        ".rs",
        ".php",
        ".rb",
        ".swift",
        ".kt",
        ".kts",
    )):
        return 1

    # -----------------------------------------------------
    # Frontend / database source
    # -----------------------------------------------------

    if path_lower.endswith((
        ".sql",
        ".html",
        ".css",
        ".scss",
    )):
        return 2

    # -----------------------------------------------------
    # Configuration files
    # -----------------------------------------------------

    if path_lower.endswith((
        ".json",
        ".yaml",
        ".yml",
        ".sh",
    )):
        return 3

    # -----------------------------------------------------
    # Anything else
    # -----------------------------------------------------

    return 4


# =========================================================
# DOWNLOAD REPOSITORY ZIP
# =========================================================

def download_repository_archive(
    owner: str,
    repo: str,
    branch: str,
):
    encoded_branch = quote(
        branch,
        safe="",
    )

    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}/zipball/"
        f"{encoded_branch}"
    )

    try:
        response = session.get(
            url,
            headers=get_headers(),
            timeout=(15, 120),
            allow_redirects=True,
            stream=True,
        )

    except requests.RequestException as error:
        raise ValueError(
            "Could not download GitHub repository: "
            f"{error}"
        )

    if response.status_code == 401:
        raise ValueError(
            "GitHub authentication failed "
            "while downloading the repository."
        )

    if response.status_code == 403:
        raise ValueError(
            "GitHub denied repository download. "
            "Check token permissions."
        )

    if response.status_code == 404:
        raise ValueError(
            "Repository archive not found."
        )

    try:
        response.raise_for_status()

    except requests.HTTPError as error:
        raise ValueError(
            f"GitHub archive error "
            f"({response.status_code}): {error}"
        )

    # Check archive size if GitHub provides it
    content_length = (
        response.headers.get(
            "Content-Length"
        )
    )

    if content_length:
        try:
            if (
                int(content_length)
                > MAX_ARCHIVE_SIZE
            ):
                raise ValueError(
                    "Repository archive is too large "
                    "for CodeGuard to analyze."
                )
        except ValueError as error:
            if "too large" in str(error):
                raise

    buffer = io.BytesIO()
    total_bytes = 0

    try:
        for chunk in response.iter_content(
            chunk_size=64 * 1024
        ):
            if not chunk:
                continue

            total_bytes += len(chunk)

            if total_bytes > MAX_ARCHIVE_SIZE:
                raise ValueError(
                    "Repository archive is too large "
                    "for CodeGuard to analyze."
                )

            buffer.write(chunk)

    except requests.RequestException as error:
        raise ValueError(
            "Repository download was interrupted: "
            f"{error}"
        )

    buffer.seek(0)

    return buffer


# =========================================================
# EXTRACT AND PRIORITIZE SOURCE FILES
# =========================================================

def extract_source_files(
    archive_buffer,
):
    results = []

    try:
        with zipfile.ZipFile(
            archive_buffer,
            "r",
        ) as archive:

            candidates = []

            # -------------------------------------------------
            # Find candidate files first
            # -------------------------------------------------

            for archive_name in archive.namelist():

                # Ignore directories
                if archive_name.endswith("/"):
                    continue

                # GitHub ZIP normally has:
                #
                # username-repository-xxxx/
                #
                # Remove that first directory.
                parts = archive_name.split(
                    "/",
                    1,
                )

                if len(parts) != 2:
                    continue

                relative_path = parts[1]

                if not relative_path:
                    continue

                # Ignore unwanted directories
                if should_ignore_path(
                    relative_path
                ):
                    continue

                # Only supported files
                if not is_code_file(
                    relative_path
                ):
                    continue

                try:
                    info = archive.getinfo(
                        archive_name
                    )
                except KeyError:
                    continue

                # Ignore large files
                if (
                    info.file_size
                    > MAX_FILE_SIZE
                ):
                    continue

                priority = get_file_priority(
                    relative_path
                )

                candidates.append({
                    "archive_name": archive_name,
                    "relative_path": relative_path,
                    "size": info.file_size,
                    "priority": priority,
                })

            # -------------------------------------------------
            # Put application source first
            # -------------------------------------------------

            candidates.sort(
                key=lambda item: (
                    item["priority"],
                    item["relative_path"].lower(),
                )
            )

            # -------------------------------------------------
            # Extract top files
            # -------------------------------------------------

            for item in candidates[
                :MAX_FILES
            ]:

                try:
                    raw = archive.read(
                        item["archive_name"]
                    )

                    content = raw.decode(
                        "utf-8",
                        errors="replace",
                    )

                except Exception:
                    continue

                results.append({
                    "filename": item[
                        "relative_path"
                    ],
                    "size": item[
                        "size"
                    ],
                    "content": content,
                })

    except zipfile.BadZipFile:
        raise ValueError(
            "GitHub returned an invalid repository archive."
        )

    return results


# =========================================================
# MAIN REPOSITORY FUNCTION
# =========================================================

def get_repository_files(
    repo_url: str,
):
    """
    Fetch a GitHub repository and return
    prioritized source files from its
    default branch.
    """

    # -----------------------------------------------------
    # Parse URL
    # -----------------------------------------------------

    owner, repo = parse_github_url(
        repo_url
    )

    # -----------------------------------------------------
    # Get repository information
    # -----------------------------------------------------

    repository = get_repository_info(
        owner,
        repo,
    )

    default_branch = repository.get(
        "default_branch"
    )

    if not default_branch:
        raise ValueError(
            "Could not determine repository "
            "default branch."
        )

    # -----------------------------------------------------
    # Download repository
    # -----------------------------------------------------

    archive = download_repository_archive(
        owner,
        repo,
        default_branch,
    )

    # -----------------------------------------------------
    # Extract prioritized source files
    # -----------------------------------------------------

    files = extract_source_files(
        archive
    )

    return {
        "repository": (
            f"{owner}/{repo}"
        ),
        "default_branch": (
            default_branch
        ),
        "files": files,
    }