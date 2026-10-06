import { useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  // -----------------------------
  // Code Review State
  // -----------------------------
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // -----------------------------
  // GitHub PR Review State
  // -----------------------------
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/nishanthalagirisamy-art/CodeGuard-AI"
  );
  const [prNumber, setPrNumber] = useState("1");
  const [githubResult, setGithubResult] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);

  // -----------------------------
  // File Upload
  // -----------------------------
  const fileInputRef = useRef(null);

  // -----------------------------
  // Normal Code Review
  // -----------------------------
  const reviewCode = async () => {
    if (!code.trim()) {
      alert("Please enter some code.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backend request failed.");
      }

      setResult(data);
    } catch (error) {
      console.error(error);

      setResult({
        error:
          error.message ||
          "Could not connect to the backend. Make sure FastAPI is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // GitHub Pull Request Review
  // -----------------------------
  const reviewPullRequest = async () => {
    if (!repoUrl.trim()) {
      alert("Please enter a GitHub repository URL.");
      return;
    }

    if (!prNumber.trim()) {
      alert("Please enter the Pull Request number.");
      return;
    }

    setGithubLoading(true);
    setGithubResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/github-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo_url: repoUrl.trim(),
          pr_number: Number(prNumber),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "GitHub review failed.");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGithubResult(data);
    } catch (error) {
      console.error(error);

      setGithubResult({
        error:
          error.message ||
          "Could not review the GitHub Pull Request.",
      });
    } finally {
      setGithubLoading(false);
    }
  };

  // -----------------------------
  // Clear Code
  // -----------------------------
  const clearCode = () => {
    setCode("");
    setResult(null);
    setCopied(false);
  };

  // -----------------------------
  // Copy Code
  // -----------------------------
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

  // -----------------------------
  // Download Code
  // -----------------------------
  const downloadCode = () => {
    if (!code.trim()) {
      alert("There is no code to download.");
      return;
    }

    const blob = new Blob([code], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "reviewed-code.py";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // -----------------------------
  // Upload Code
  // -----------------------------
  const uploadCode = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      setCode(String(e.target?.result || ""));
      setResult(null);
    };

    reader.onerror = () => {
      alert("Could not read the selected file.");
    };

    reader.readAsText(file);

    // Allow selecting the same file again
    event.target.value = "";
  };

  // -----------------------------
  // Helper Functions
  // -----------------------------
  const getSeverityClass = (severity) => {
    const value = String(severity || "").toLowerCase();

    if (value === "critical" || value === "high") {
      return "high";
    }

    if (value === "medium") {
      return "medium";
    }

    return "low";
  };

  const getRiskClass = (level) => {
    const value = String(level || "").toLowerCase();

    if (value === "high") {
      return "high";
    }

    if (value === "medium") {
      return "medium";
    }

    return "low";
  };

  const countFindings = (findings = [], type) => {
    return findings.filter(
      (finding) =>
        String(finding.type || "").toLowerCase() ===
        type.toLowerCase()
    ).length;
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">C</div>

          <div>
            <h2>CodeGuard</h2>
            <span>AI Developer Tools</span>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-section">
            <span className="nav-title">WORKSPACE</span>

            <a className="nav-item active" href="#code-review">
              <span>⌘</span>
              Code Review
            </a>

            <a className="nav-item" href="#pull-request">
              <span>⑂</span>
              Pull Requests
            </a>

            <a className="nav-item" href="#security">
              <span>🛡</span>
              Security
            </a>
          </div>

          <div className="nav-section">
            <span className="nav-title">PROJECT</span>

            <a className="nav-item" href="#history">
              <span>◷</span>
              Review History
            </a>

            <a className="nav-item" href="#repository">
              <span>▣</span>
              Repository
            </a>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* HEADER */}
        <header className="topbar">
          <div>
            <h1>AI Code Review & Release-Risk Assistant</h1>
            <p>
              Detect bugs, security vulnerabilities and release risks
              using rules + Gemini AI.
            </p>
          </div>

          <div className="status-badge">
            ● AI Connected
          </div>
        </header>

        {/* CODE REVIEW */}
        <section id="code-review" className="workspace-card">
          <div className="card-header">
            <div>
              <span className="card-title">
                Code Review
              </span>

              <span className="card-subtitle">
                Paste code or upload a source file
              </span>
            </div>
          </div>

          {/* CODE EDITOR */}
          <div className="code-editor-wrapper">
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setResult(null);
              }}
              placeholder={`# Paste your Python code here

def hello_world():
    print("Hello World")

hello_world()`}
              spellCheck="false"
              className="code-editor"
            />
          </div>

          {/* HIDDEN FILE INPUT */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.html,.css,.txt"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          {/* BUTTONS */}
          <div className="editor-actions">
            <div className="left-actions">
              <button
                className="tool-btn"
                onClick={clearCode}
              >
                🗑 Clear
              </button>

              <button
                className="tool-btn"
                onClick={copyCode}
              >
                📋 {copied ? "Copied!" : "Copy"}
              </button>

              <button
                className="tool-btn"
                onClick={downloadCode}
              >
                ↓ Download
              </button>

              <button
                className="tool-btn"
                onClick={uploadCode}
              >
                ↑ Upload
              </button>
            </div>

            <button
              className="analyze-btn"
              onClick={reviewCode}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>✦ Analyze with AI</>
              )}
            </button>
          </div>
        </section>

        {/* CODE REVIEW RESULT */}
        <section className="results-card">
          <div className="card-header">
            <div>
              <span className="card-title">
                Release Risk
              </span>

              <span className="card-subtitle">
                AI-powered security assessment
              </span>
            </div>
          </div>

          {!result ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>

              <h3>Ready to analyze</h3>

              <p>
                Submit your code to receive a detailed
                release-risk assessment.
              </p>
            </div>
          ) : result.error ? (
            <div className="empty-state">
              <div className="empty-icon">⚠</div>

              <h3>Analysis Error</h3>

              <p>{result.error}</p>
            </div>
          ) : (
            <div className="analysis-result">
              <div className="stats-grid">
                <div className="stat-card">
                  <span>Bugs</span>
                  <strong>
                    {countFindings(result.findings, "Bug")}
                  </strong>
                </div>

                <div className="stat-card">
                  <span>Security</span>
                  <strong>
                    {countFindings(
                      result.findings,
                      "Security"
                    )}
                  </strong>
                </div>

                <div className="stat-card">
                  <span>Total Findings</span>
                  <strong>
                    {result.findings?.length || 0}
                  </strong>
                </div>

                <div className="stat-card">
                  <span>Risk Score</span>
                  <strong>
                    {result.risk_score}/100
                  </strong>
                </div>
              </div>

              <div
                className={`risk-panel ${getRiskClass(
                  result.risk_level
                )}`}
              >
                <div>
                  <span>Release Risk</span>
                  <h2>
                    {result.risk_level}
                  </h2>
                </div>

                <div>
                  <span>Decision</span>
                  <h2>
                    {result.decision}
                  </h2>
                </div>
              </div>

              {result.ai_summary && (
                <div className="summary-box">
                  <h3>AI Summary</h3>
                  <p>{result.ai_summary}</p>
                </div>
              )}

              <div className="findings-section">
                <h3>Issues Found</h3>

                {result.findings?.length > 0 ? (
                  result.findings.map((finding, index) => (
                    <div
                      className={`issue ${getSeverityClass(
                        finding.severity
                      )}`}
                      key={index}
                    >
                      <div className="issue-header">
                        <strong>
                          {finding.severity || "Info"} —{" "}
                          {finding.type || "Finding"}
                        </strong>
                      </div>

                      <p>{finding.message}</p>

                      {finding.recommendation && (
                        <p>
                          <strong>
                            Recommendation:
                          </strong>{" "}
                          {finding.recommendation}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No issues found</h3>
                    <p>
                      The submitted code passed the current
                      review checks.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* GITHUB PR REVIEW */}
        <section
          id="pull-request"
          className="results-card github-card"
        >
          <div className="card-header">
            <div>
              <span className="card-title">
                GitHub Pull Request Review
              </span>

              <span className="card-subtitle">
                Analyze changed files from a GitHub PR
                using CodeGuard + Gemini
              </span>
            </div>
          </div>

          <div className="github-form">
            <div className="form-group">
              <label>Repository URL</label>

              <input
                type="text"
                value={repoUrl}
                onChange={(e) =>
                  setRepoUrl(e.target.value)
                }
                placeholder="https://github.com/owner/repository"
              />
            </div>

            <div className="form-group">
              <label>Pull Request Number</label>

              <input
                type="number"
                value={prNumber}
                onChange={(e) =>
                  setPrNumber(e.target.value)
                }
                placeholder="1"
                min="1"
              />
            </div>

            <button
              className="analyze-btn"
              onClick={reviewPullRequest}
              disabled={githubLoading}
            >
              {githubLoading ? (
                <>
                  <span className="spinner"></span>
                  Reviewing PR...
                </>
              ) : (
                <>🔍 Review GitHub PR</>
              )}
            </button>
          </div>

          {/* GITHUB RESULT */}
          {githubResult?.error ? (
            <div className="empty-state github-error">
              <div className="empty-icon">⚠</div>

              <h3>GitHub Review Error</h3>

              <p>{githubResult.error}</p>
            </div>
          ) : githubResult ? (
            <div className="analysis-result">
              <div className="stats-grid">
                <div className="stat-card">
                  <span>Files Reviewed</span>
                  <strong>
                    {githubResult.files_reviewed}
                  </strong>
                </div>

                <div className="stat-card">
                  <span>Risk Score</span>
                  <strong>
                    {githubResult.risk_score}/100
                  </strong>
                </div>

                <div className="stat-card">
                  <span>Risk Level</span>
                  <strong>
                    {githubResult.risk_level}
                  </strong>
                </div>

                <div className="stat-card">
                  <span>Decision</span>
                  <strong>
                    {githubResult.decision}
                  </strong>
                </div>
              </div>

              <div
                className={`risk-panel ${getRiskClass(
                  githubResult.risk_level
                )}`}
              >
                <div>
                  <span>Repository</span>
                  <h3>
                    {githubResult.repository}
                  </h3>
                </div>

                <div>
                  <span>Pull Request</span>
                  <h3>
                    #{githubResult.pull_request}
                  </h3>
                </div>
              </div>

              <div className="findings-section">
                <h3>Security Findings</h3>

                {githubResult.findings?.length > 0 ? (
                  githubResult.findings.map(
                    (finding, index) => (
                      <div
                        className={`issue ${getSeverityClass(
                          finding.severity
                        )}`}
                        key={index}
                      >
                        <div className="issue-header">
                          <strong>
                            {finding.severity ||
                              "Info"}{" "}
                            —{" "}
                            {finding.type ||
                              "Finding"}
                          </strong>
                        </div>

                        <p>{finding.message}</p>

                        {finding.recommendation && (
                          <p>
                            <strong>
                              Recommendation:
                            </strong>{" "}
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
                    <h3>No security issues found</h3>
                    <p>
                      CodeGuard did not find issues in
                      the reviewed changes.
                    </p>
                  </div>
                )}
              </div>

              {/* FILE RESULTS */}
              {githubResult.file_results?.length > 0 && (
                <div className="findings-section">
                  <h3>Reviewed Files</h3>

                  {githubResult.file_results.map(
                    (file, index) => (
                      <div
                        className="file-result"
                        key={index}
                      >
                        <div>
                          <strong>
                            {file.filename}
                          </strong>

                          <p>
                            {file.status} · +{file.additions}{" "}
                            / -{file.deletions}
                          </p>
                        </div>

                        <span>
                          {file.findings?.length || 0}{" "}
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
              <div className="empty-icon">⑂</div>

              <h3>Review a Pull Request</h3>

              <p>
                Enter a public GitHub repository and PR
                number to analyze its changed files.
              </p>
            </div>
          )}
        </section>

        {/* SECURITY */}
        <section id="security" className="results-card">
          <div className="card-header">
            <div>
              <span className="card-title">
                CodeGuard Protection
              </span>

              <span className="card-subtitle">
                Rule-based + AI-powered analysis
              </span>
            </div>
          </div>

          <div className="security-features">
            <div className="feature-card">
              <span>🔐</span>
              <h3>Secret Detection</h3>
              <p>
                Detect hardcoded passwords and sensitive
                credentials.
              </p>
            </div>

            <div className="feature-card">
              <span>💉</span>
              <h3>Injection Detection</h3>
              <p>
                Identify suspicious SQL and unsafe input
                handling.
              </p>
            </div>

            <div className="feature-card">
              <span>🤖</span>
              <h3>Gemini AI Review</h3>
              <p>
                Understand code context and recommend
                fixes.
              </p>
            </div>

            <div className="feature-card">
              <span>🚦</span>
              <h3>Release Decision</h3>
              <p>
                Automatically classify changes as deploy,
                review or block.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <p>
            CodeGuard — AI-powered secure software delivery
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;