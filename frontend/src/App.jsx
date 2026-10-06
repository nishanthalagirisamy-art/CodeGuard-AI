import { useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8001";

function App() {
  // =========================================================
  // NORMAL CODE REVIEW
  // =========================================================

  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // =========================================================
  // GITHUB REPOSITORY REVIEW
  // =========================================================

  const [repoUrl, setRepoUrl] = useState("");
  const [githubResult, setGithubResult] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);

  // =========================================================
  // FILE INPUT
  // =========================================================

  const fileInputRef = useRef(null);

  // =========================================================
  // NORMAL CODE REVIEW
  // =========================================================

  const reviewCode = async () => {
    if (!code.trim()) {
      alert("Please enter some code.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Code review failed."
        );
      }

      setResult(data);
    } catch (error) {
      console.error("Code review error:", error);

      setResult({
        error:
          error.message ||
          "Could not connect to the backend. Make sure FastAPI is running on port 8001.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // NORMALIZE GITHUB REPOSITORY URL
  // Accepts:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo/tree/main
  // https://github.com/owner/repo/pull/1
  // etc.
  // =========================================================

  const normalizeGitHubUrl = (input) => {
    let url = input.trim();

    if (!url) {
      throw new Error(
        "Please enter a GitHub repository URL."
      );
    }

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(
        "Please enter a valid GitHub URL."
      );
    }

    const hostname =
      parsedUrl.hostname.toLowerCase();

    if (
      hostname !== "github.com" &&
      hostname !== "www.github.com"
    ) {
      throw new Error(
        "Please enter a github.com URL."
      );
    }

    const parts = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    if (parts.length < 2) {
      throw new Error(
        "The URL must contain a GitHub repository."
      );
    }

    const owner = parts[0];

    const repository = parts[1].replace(
      /\.git$/i,
      ""
    );

    if (!owner || !repository) {
      throw new Error(
        "Invalid GitHub repository URL."
      );
    }

    return `https://github.com/${owner}/${repository}`;
  };

  // =========================================================
  // GITHUB REPOSITORY REVIEW
  // =========================================================

  const reviewRepository = async () => {
    if (!repoUrl.trim()) {
      alert(
        "Please enter a GitHub repository URL."
      );
      return;
    }

    setGithubLoading(true);
    setGithubResult(null);

    try {
      const normalizedUrl =
        normalizeGitHubUrl(repoUrl);

      const response = await fetch(
        `${API_BASE_URL}/github-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo_url: normalizedUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            "GitHub repository review failed."
        );
      }

      setGithubResult(data);
    } catch (error) {
      console.error(
        "GitHub repository review error:",
        error
      );

      setGithubResult({
        error:
          error.message ||
          "Could not connect to the backend.",
      });
    } finally {
      setGithubLoading(false);
    }
  };

  // =========================================================
  // CLEAR CODE
  // =========================================================

  const clearCode = () => {
    setCode("");
    setResult(null);
    setCopied(false);
  };

  // =========================================================
  // COPY CODE
  // =========================================================

  const copyCode = async () => {
    if (!code.trim()) {
      alert("There is no code to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Could not copy the code.");
    }
  };

  // =========================================================
  // DOWNLOAD CODE
  // =========================================================

  const downloadCode = () => {
    if (!code.trim()) {
      alert("There is no code to download.");
      return;
    }

    const blob = new Blob(
      [code],
      {
        type: "text/plain",
      }
    );

    const url = URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "reviewed-code.py";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================================================
  // OPEN FILE SELECTOR
  // =========================================================

  const uploadCode = () => {
    fileInputRef.current?.click();
  };

  // =========================================================
  // HANDLE FILE UPLOAD
  // =========================================================

  const handleFileUpload = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = (e) => {
      setCode(
        String(
          e.target?.result || ""
        )
      );

      setResult(null);
    };

    reader.onerror = () => {
      alert(
        "Could not read the selected file."
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const getSeverityClass = (
    severity
  ) => {
    const value =
      String(
        severity || ""
      ).toLowerCase();

    if (
      value === "critical" ||
      value === "high"
    ) {
      return "high";
    }

    if (value === "medium") {
      return "medium";
    }

    return "low";
  };

  const getRiskClass = (
    level
  ) => {
    const value =
      String(
        level || ""
      ).toLowerCase();

    if (value === "high") {
      return "high";
    }

    if (value === "medium") {
      return "medium";
    }

    return "low";
  };

  const countFindings = (
    findings = [],
    type
  ) => {
    return findings.filter(
      (finding) =>
        String(
          finding?.type || ""
        ).toLowerCase() ===
        String(type).toLowerCase()
    ).length;
  };

  const getRiskAngle = (
    score
  ) => {
    const safeScore =
      Math.min(
        Math.max(
          Number(score) || 0,
          0
        ),
        100
      );

    return (
      safeScore * 3.6
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            C
          </div>

          <div>
            <h2>
              CodeGuard
            </h2>

            <span>
              AI Developer Tools
            </span>
          </div>

        </div>

        <nav className="nav">

          <div className="nav-section">

            <span className="nav-title">
              WORKSPACE
            </span>

            <a
              className="nav-item active"
              href="#code-review"
            >
              <span>⌘</span>
              Code Review
            </a>

            <a
              className="nav-item"
              href="#repository-review"
            >
              <span>⑂</span>
              Repository Review
            </a>

            <a
              className="nav-item"
              href="#security"
            >
              <span>🛡</span>
              Security
            </a>

          </div>

          <div className="nav-section">

            <span className="nav-title">
              PROJECT
            </span>

            <a
              className="nav-item"
              href="#repository"
            >
              <span>▣</span>
              Repository
            </a>

          </div>

        </nav>

      </aside>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="main-content">

        {/* ===================================================
            HEADER
            =================================================== */}

        <header className="topbar">

          <div>

            <h1>
              AI Code Review &
              Release-Risk Assistant
            </h1>

            <p>
              Detect bugs, security
              vulnerabilities and release
              risks using rules + Gemini AI.
            </p>

          </div>

          <div className="status-badge">
            ● AI Connected
          </div>

        </header>

        {/* ===================================================
            CODE REVIEW EDITOR
            =================================================== */}

        <section
          id="code-review"
          className="workspace-card"
        >

          <div className="card-header">

            <div>

              <span className="card-title">
                Code Review
              </span>

              <span className="card-subtitle">
                Paste code or upload a
                source file
              </span>

            </div>

          </div>

          <div className="code-editor-wrapper">

            <textarea
              className="code-editor"
              value={code}
              onChange={(e) => {
                setCode(
                  e.target.value
                );

                setResult(null);
              }}
              placeholder={`# Paste your Python code here

def hello_world():
    print("Hello World")

hello_world()`}
              spellCheck="false"
            />

          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.html,.css,.txt"
            onChange={
              handleFileUpload
            }
            style={{
              display: "none",
            }}
          />

          <div className="editor-actions">

            <div className="left-actions">

              <button
                className="tool-btn"
                onClick={
                  clearCode
                }
              >
                🗑 Clear
              </button>

              <button
                className="tool-btn"
                onClick={
                  copyCode
                }
              >
                📋{" "}
                {
                  copied
                    ? "Copied!"
                    : "Copy"
                }
              </button>

              <button
                className="tool-btn"
                onClick={
                  downloadCode
                }
              >
                ↓ Download
              </button>

              <button
                className="tool-btn"
                onClick={
                  uploadCode
                }
              >
                ↑ Upload
              </button>

            </div>

            <button
              className="analyze-btn"
              onClick={
                reviewCode
              }
              disabled={
                loading
              }
            >

              {loading ? (

                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>

              ) : (

                <>
                  ✦ Analyze with AI
                </>

              )}

            </button>

          </div>

        </section>

        {/* ===================================================
            NORMAL CODE REVIEW RESULT
            =================================================== */}

        <section className="results-card">

          <div className="card-header">

            <div>

              <span className="card-title">
                Release Risk
              </span>

              <span className="card-subtitle">
                AI-powered security
                assessment
              </span>

            </div>

          </div>

          {!result ? (

            <div className="empty-state">

              <div className="empty-icon">
                ✦
              </div>

              <h3>
                Ready to analyze
              </h3>

              <p>
                Submit your code to
                receive a detailed
                release-risk assessment.
              </p>

            </div>

          ) : result.error ? (

            <div className="empty-state">

              <div className="empty-icon">
                ⚠
              </div>

              <h3>
                Analysis Error
              </h3>

              <p>
                {
                  result.error
                }
              </p>

            </div>

          ) : (

            <div className="analysis-result">

              <div className="stats-grid">

                <div className="stat-card">

                  <span>
                    Security
                  </span>

                  <strong>
                    {
                      countFindings(
                        result.findings,
                        "Security"
                      )
                    }
                  </strong>

                </div>

                <div className="stat-card">

                  <span>
                    Bugs
                  </span>

                  <strong>
                    {
                      countFindings(
                        result.findings,
                        "Bugs"
                      ) +
                      countFindings(
                        result.findings,
                        "Bug"
                      )
                    }
                  </strong>

                </div>

                <div className="stat-card">

                  <span>
                    Total Findings
                  </span>

                  <strong>
                    {
                      result.findings
                        ?.length || 0
                    }
                  </strong>

                </div>

                <div className="stat-card">

                  <span>
                    Risk Score
                  </span>

                  <strong>
                    {
                      result.risk_score
                    }
                    /100
                  </strong>

                </div>

              </div>

              <div className="risk-visual">

                <div
                  className="risk-circle"
                  style={{
                    "--risk": `${getRiskAngle(
                      result.risk_score
                    )}deg`,
                  }}
                >

                  <div className="risk-circle-inner">

                    <strong>
                      {
                        result.risk_score
                      }
                    </strong>

                    <span>
                      /100
                    </span>

                  </div>

                </div>

                <div className="risk-details">

                  <span className="risk-label">
                    RELEASE RISK
                  </span>

                  <h2>
                    {
                      result.risk_level
                    }
                  </h2>

                  <p>
                    CodeGuard recommends:
                    <strong>
                      {" "}
                      {
                        result.decision
                      }
                    </strong>
                  </p>

                  <div className="risk-bar">

                    <div
                      className="risk-bar-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(
                            Number(
                              result.risk_score
                            ) || 0,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

              {result.ai_summary && (

                <div className="summary-box">

                  <h3>
                    Gemini AI Summary
                  </h3>

                  <p>
                    {
                      result.ai_summary
                    }
                  </p>

                </div>

              )}

              <div className="findings-section">

                <h3>
                  Issues Found
                </h3>

                {result.findings?.length > 0 ? (

                  result.findings.map(
                    (
                      finding,
                      index
                    ) => (

                      <div
                        key={index}
                        className={`issue ${getSeverityClass(
                          finding?.severity
                        )}`}
                      >

                        <div className="issue-header">

                          <strong>
                            {
                              finding?.severity ||
                              "Info"
                            }
                            {" — "}
                            {
                              finding?.type ||
                              "Finding"
                            }
                          </strong>

                        </div>

                        <p>
                          {
                            finding?.message ||
                            "No description provided."
                          }
                        </p>

                        {finding?.recommendation && (

                          <p>

                            <strong>
                              Recommendation:
                            </strong>

                            {" "}

                            {
                              finding.recommendation
                            }

                          </p>

                        )}

                      </div>

                    )
                  )

                ) : (

                  <div className="empty-state">

                    <h3>
                      No issues found
                    </h3>

                    <p>
                      The submitted code
                      passed the current
                      review checks.
                    </p>

                  </div>

                )}

              </div>

            </div>

          )}

        </section>

        {/* ===================================================
            GITHUB REPOSITORY REVIEW
            =================================================== */}

        <section
          id="repository-review"
          className="results-card github-card"
        >

          <div className="card-header">

            <div>

              <span className="card-title">
                GitHub Repository Review
              </span>

              <span className="card-subtitle">
                Analyze any accessible GitHub
                repository — no Pull Request
                required
              </span>

            </div>

          </div>

          <div className="github-form">

            <div className="form-group">

              <label>
                GitHub Repository URL
              </label>

              <input
                type="text"
                value={repoUrl}
                onChange={(e) =>
                  setRepoUrl(
                    e.target.value
                  )
                }
                placeholder="https://github.com/owner/repository"
              />

              <small
                style={{
                  display: "block",
                  marginTop: "7px",
                  color: "#64748b",
                  fontSize: "11px",
                }}
              >
                Example:
             https://github.com/yourusername/your-repository.git

              </small>

            </div>

            <button
              className="analyze-btn"
              onClick={
                reviewRepository
              }
              disabled={
                githubLoading
              }
            >

              {githubLoading ? (

                <>
                  <span className="spinner"></span>
                  Reviewing Repository...
                </>

              ) : (

                <>
                  🔍 Review Repository
                </>

              )}

            </button>

          </div>

          {/* =================================================
              GITHUB RESULT
              ================================================= */}

          {githubResult?.error ? (

            <div className="empty-state github-error">

              <div className="empty-icon">
                ⚠
              </div>

              <h3>
                Repository Review Error
              </h3>

              <p>
                {
                  githubResult.error
                }
              </p>

            </div>

          ) : githubResult ? (

            <div className="analysis-result">

              <div className="stats-grid">

                <div className="stat-card">

                  <span>
                    Files Reviewed
                  </span>

                  <strong>
                    {
                      githubResult.files_reviewed
                    }
                  </strong>

                </div>

                <div className="stat-card">

                  <span>
                    Findings
                  </span>

                  <strong>
                    {
                      githubResult.findings
                        ?.length || 0
                    }
                  </strong>

                </div>

                <div className="stat-card">

                  <span>
                    Risk Level
                  </span>

                  <strong>
                    {
                      githubResult.risk_level
                    }
                  </strong>

                </div>

                <div className="stat-card">

                  <span>
                    Decision
                  </span>

                  <strong>
                    {
                      githubResult.decision
                    }
                  </strong>

                </div>

              </div>

              <div className="risk-visual">

                <div
                  className="risk-circle"
                  style={{
                    "--risk": `${getRiskAngle(
                      githubResult.risk_score
                    )}deg`,
                  }}
                >

                  <div className="risk-circle-inner">

                    <strong>
                      {
                        githubResult.risk_score
                      }
                    </strong>

                    <span>
                      /100
                    </span>

                  </div>

                </div>

                <div className="risk-details">

                  <span className="risk-label">
                    REPOSITORY RISK
                  </span>

                  <h2>
                    {
                      githubResult.risk_level
                    }
                  </h2>

                  <p>
                    CodeGuard recommends:
                    <strong>
                      {" "}
                      {
                        githubResult.decision
                      }
                    </strong>
                  </p>

                  <div className="risk-bar">

                    <div
                      className="risk-bar-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(
                            Number(
                              githubResult.risk_score
                            ) || 0,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

              <div
                className={`risk-panel ${getRiskClass(
                  githubResult.risk_level
                )}`}
              >

                <div>

                  <span>
                    Repository
                  </span>

                  <h3>
                    {
                      githubResult.repository
                    }
                  </h3>

                </div>

                <div>

                  <span>
                    Default Branch
                  </span>

                  <h3>
                    {
                      githubResult.default_branch ||
                      "main"
                    }
                  </h3>

                </div>

              </div>

              <div className="findings-section">

                <h3>
                  Security Findings
                </h3>

                {githubResult.findings?.length > 0 ? (

                  githubResult.findings.map(
                    (
                      finding,
                      index
                    ) => (

                      <div
                        key={index}
                        className={`issue ${getSeverityClass(
                          finding?.severity
                        )}`}
                      >

                        <div className="issue-header">

                          <strong>
                            {
                              finding?.severity ||
                              "Info"
                            }
                            {" — "}
                            {
                              finding?.type ||
                              "Finding"
                            }
                          </strong>

                        </div>

                        <p>
                          {
                            finding?.message ||
                            "No description provided."
                          }
                        </p>

                        {finding?.recommendation && (

                          <p>

                            <strong>
                              Recommendation:
                            </strong>

                            {" "}

                            {
                              finding.recommendation
                            }

                          </p>

                        )}

                      </div>

                    )
                  )

                ) : (

                  <div className="empty-state">

                    <h3>
                      No security issues found
                    </h3>

                    <p>
                      CodeGuard did not find
                      security issues in the
                      reviewed repository.
                    </p>

                  </div>

                )}

              </div>

              {githubResult.file_results?.length > 0 && (

                <div className="findings-section">

                  <h3>
                    Reviewed Files
                  </h3>

                  {githubResult.file_results.map(
                    (
                      file,
                      index
                    ) => (

                      <div
                        className="file-result"
                        key={index}
                      >

                        <div>

                          <strong>
                            {
                              file?.filename
                            }
                          </strong>

                          <p>
                            {
                              file?.size ||
                              0
                            }{" "}
                            bytes
                          </p>

                        </div>

                        <span>
                          {
                            file?.findings
                              ?.length || 0
                          }{" "}
                          findings
                        </span>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          ) : (

            <div className="empty-state">

              <div className="empty-icon">
                ⑂
              </div>

              <h3>
                Review a GitHub Repository
              </h3>

              <p>
                Enter any accessible GitHub
                repository URL. No Pull Request
                number is required.
              </p>

            </div>

          )}

        </section>

        {/* ===================================================
            SECURITY FEATURES
            =================================================== */}

        <section
          id="security"
          className="results-card"
        >

          <div className="card-header">

            <div>

              <span className="card-title">
                CodeGuard Protection
              </span>

              <span className="card-subtitle">
                Rule-based + AI-powered
                analysis
              </span>

            </div>

          </div>

          <div className="security-features">

            <div className="feature-card">

              <span>
                🔐
              </span>

              <h3>
                Secret Detection
              </h3>

              <p>
                Detect hardcoded passwords
                and sensitive credentials.
              </p>

            </div>

            <div className="feature-card">

              <span>
                💉
              </span>

              <h3>
                Injection Detection
              </h3>

              <p>
                Identify suspicious SQL
                and unsafe input handling.
              </p>

            </div>

            <div className="feature-card">

              <span>
                🤖
              </span>

              <h3>
                Gemini AI Review
              </h3>

              <p>
                Understand code context
                and recommend fixes.
              </p>

            </div>

            <div className="feature-card">

              <span>
                🚦
              </span>

              <h3>
                Release Decision
              </h3>

              <p>
                Automatically classify
                changes as deploy,
                review or block.
              </p>

            </div>

          </div>

        </section>

        {/* ===================================================
            REPOSITORY
            =================================================== */}

        <section
          id="repository"
          className="results-card"
        >

          <div className="card-header">

            <div>

              <span className="card-title">
                Repository Analysis
              </span>

              <span className="card-subtitle">
                Analyze source code directly
                from GitHub
              </span>

            </div>

          </div>

          <div className="file-result">

            <div>

              <strong>
                Any accessible GitHub repository
              </strong>

              <p>
                Paste a repository URL above
                to begin analysis.
              </p>

            </div>

            <span>
              GitHub
            </span>

          </div>

        </section>

        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="footer">

          <p>
            CodeGuard — AI-powered
            secure software delivery
          </p>

        </footer>

      </main>

    </div>
  );
}

export default App;