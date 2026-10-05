import { useRef, useState } from "react";
import "./App.css";

function App() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // Analyze code
  const reviewCode = async () => {
    if (!code.trim()) {
      alert("Please enter some code.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert(
        "Could not connect to backend. Make sure FastAPI is running on port 8000."
      );
    }

    setLoading(false);
  };

  // Clear code and results
  const clearCode = () => {
    setCode("");
    setResult(null);
    setCopied(false);
  };

  // Copy code
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
      alert("Could not copy the code.");
    }
  };

  // Download code as .py file
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

  // Open file selector
  const uploadCode = () => {
    fileInputRef.current.click();
  };

  // Read uploaded file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      setCode(e.target.result);
      setResult(null);
    };

    reader.onerror = () => {
      alert("Could not read the selected file.");
    };

    reader.readAsText(file);

    // Allow selecting the same file again
    event.target.value = "";
  };

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

            <a className="nav-item active">
              <span>⌘</span>
              Code Review
            </a>

            <a className="nav-item">
              <span>⑂</span>
              Pull Requests
            </a>

            <a className="nav-item">
              <span>🛡</span>
              Security
            </a>
          </div>

          <div className="nav-section">
            <span className="nav-title">PROJECT</span>

            <a className="nav-item">
              <span>◷</span>
              Review History
            </a>

            <a className="nav-item">
              <span>▣</span>
              Repository
            </a>
          </div>

          <div className="nav-section">
            <span className="nav-title">SYSTEM</span>

            <a className="nav-item">
              <span>⚙</span>
              Settings
            </a>
          </div>

        </nav>

        <div className="sidebar-bottom">

          <div className="status-dot"></div>

          <div>
            <strong>System Online</strong>
            <span>All services operational</span>
          </div>

        </div>

      </aside>


      {/* MAIN AREA */}
      <div className="main-area">

        {/* TOP BAR */}
        <header className="topbar">

          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="separator">/</span>
            <strong>Code Review</strong>
          </div>

          <div className="topbar-right">

            <div className="github-status">
              <span className="github-dot"></span>
              GitHub Connected
            </div>

            <div className="avatar">
              N
            </div>

          </div>

        </header>


        {/* CONTENT */}
        <main className="content">

          {/* HERO */}
          <section className="hero">

            <div>

              <span className="eyebrow">
                INTELLIGENT CODE ANALYSIS
              </span>

              <h1>
                Review code before it
                <br />
                reaches production.
              </h1>

              <p>
                Detect security vulnerabilities, code quality issues,
                and release risks with AI-powered analysis.
              </p>

            </div>

            <div className="hero-badge">
              <span>✦</span>
              AI ENGINE ACTIVE
            </div>

          </section>


          {/* STATS */}
          <section className="stats-grid">

            <div className="stat-card">
              <span className="stat-label">
                TOTAL REVIEWS
              </span>

              <strong>24</strong>

              <span className="stat-change">
                ↑ 12% this month
              </span>
            </div>


            <div className="stat-card">
              <span className="stat-label">
                ISSUES FOUND
              </span>

              <strong>18</strong>

              <span className="stat-change">
                6 critical
              </span>
            </div>


            <div className="stat-card">
              <span className="stat-label">
                AVG. RISK SCORE
              </span>

              <strong>32<span>/100</span></strong>

              <span className="stat-change">
                ↓ 8% improvement
              </span>
            </div>


            <div className="stat-card">
              <span className="stat-label">
                DEPLOYMENTS
              </span>

              <strong>21</strong>

              <span className="stat-change">
                3 blocked
              </span>
            </div>

          </section>


          {/* CODE REVIEW AREA */}
          <section className="review-layout">

            {/* CODE EDITOR */}
            <div className="editor-card">

              <div className="card-header">

                <div>
                  <span className="card-title">
                    Code Analysis
                  </span>

                  <span className="card-subtitle">
                    Paste or upload your source code
                  </span>
                </div>

                <div className="file-badge">
                  PYTHON
                </div>

              </div>


              <div className="file-bar">

                <span>main.py</span>

                <span className="file-status">
                  ● Ready
                </span>

              </div>


              <div className="editor">

                <div className="line-numbers">

                  {Array.from(
                    {
                      length: Math.max(
                        code.split("\n").length,
                        10
                      ),
                    },
                    (_, index) => (
                      <span key={index}>
                        {index + 1}
                      </span>
                    )
                  )}

                </div>


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
                    title="Clear all code"
                  >
                    🗑 Clear
                  </button>

                  <button
                    className="tool-btn"
                    onClick={copyCode}
                    title="Copy code"
                  >
                    📋 {copied ? "Copied!" : "Copy"}
                  </button>

                  <button
                    className="tool-btn"
                    onClick={downloadCode}
                    title="Download code"
                  >
                    ↓ Download
                  </button>

                  <button
                    className="tool-btn"
                    onClick={uploadCode}
                    title="Upload code file"
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
                    <>
                      ✦ Analyze with AI
                    </>
                  )}
                </button>

              </div>

            </div>


            {/* RESULTS */}
            <div className="results-card">

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

                  <div className="empty-icon">
                    ✦
                  </div>

                  <h3>
                    Ready to analyze
                  </h3>

                  <p>
                    Submit your code to receive a detailed
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
                    {result.error}
                  </p>

                </div>

              ) : (

                <div className="analysis-result">

                  <div className="risk-summary">

                    <div>

                      <span className="risk-label">
                        RISK SCORE
                      </span>

                      <div className="risk-score">
                        {result.risk_score}
                        <span>/100</span>
                      </div>

                    </div>

                    <div
                      className={`risk-badge ${result.risk_level?.toLowerCase()}`}
                    >
                      {result.risk_level}
                    </div>

                  </div>


                  <div className="risk-meter">

                    <div
                      className="risk-meter-fill"
                      style={{
                        width: `${result.risk_score}%`,
                      }}
                    ></div>

                  </div>


                  <div className="decision-box">

                    <span>RELEASE DECISION</span>

                    <strong>
                      {result.decision}
                    </strong>

                  </div>


                  <div className="findings-section">

                    <div className="findings-header">

                      <span>
                        FINDINGS
                      </span>

                      <strong>
                        {result.findings?.length || 0}
                      </strong>

                    </div>


                    {result.findings &&
                    result.findings.length > 0 ? (

                      result.findings.map(
                        (finding, index) => (

                          <div
                            className="finding"
                            key={index}
                          >

                            <div className="finding-icon">
                              !
                            </div>

                            <div>

                              <div className="finding-title">

                                <strong>
                                  {finding.severity}
                                </strong>

                                <span>
                                  {finding.type}
                                </span>

                              </div>

                              <p>
                                {finding.message}
                              </p>

                            </div>

                          </div>

                        )
                      )

                    ) : (

                      <div className="safe-message">
                        ✓ No major issues detected
                      </div>

                    )}

                  </div>

                </div>

              )}

            </div>

          </section>


          {/* FOOTER */}
          <footer>

            <span>
              CodeGuard AI • Intelligent Developer Tools
            </span>

            <span>
              v1.0.0
            </span>

          </footer>

        </main>

      </div>

    </div>
  );
}

export default App;