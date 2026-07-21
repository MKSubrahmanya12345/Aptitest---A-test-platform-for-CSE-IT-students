// ??$$$
import React, { useState, useEffect } from "react";
import { reviewService } from "../../services/review.service";
import { testApiService } from "../../services/test.service";
import "../../styles/student.css";

// Helper to render markdown table into HTML table
function renderMarkdownTable(markdown) {
  if (!markdown) return null;
  try {
    const lines = markdown.trim().split("\n").map(l => l.trim()).filter(l => l !== "");
    if (lines.length === 0) return null;

    const parseRow = (line) => {
      let cells = line.split("|").map(c => c.trim());
      if (cells[0] === "") cells.shift();
      if (cells[cells.length - 1] === "") cells.pop();
      return cells;
    };

    const headers = parseRow(lines[0]);
    const rows = [];
    const startIndex = (lines[1] && lines[1].includes("-")) ? 2 : 1;

    for (let i = startIndex; i < lines.length; i++) {
      rows.push(parseRow(lines[i]));
    }

    return (
      <div className="dataset-table-container">
        <table>
          <thead>
            <tr>
              {headers.map((h, idx) => <th key={idx}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (e) {
    return <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{markdown}</pre>;
  }
}

// Helper to render correct answer key inside review screen
function renderCorrectAnswer(q) {
  const ans = q.correct_answer;
  if (!ans) return "N/A";

  switch (q.question_type) {
    case "mcq_single":
      return `Option ${ans.value || "N/A"}`;
    case "boolean":
      return ans.value ? "Yes / True" : "No / False";
    case "fraction":
      return `${ans.numerator}/${ans.denominator}`;
    case "ratio":
      return ans.values ? ans.values.join(":") : "N/A";
    case "numeric":
      return `${ans.value}`;
    case "numeric_with_unit":
      return `${ans.value} ${ans.unit || ""}`;
    default:
      return ans.answers ? ans.answers.join(" | ") : ans.value || JSON.stringify(ans);
  }
}

// Helper to render user answer in review screen
function renderUserAnswer(q) {
  const ans = q.user_answer;
  if (ans === undefined || ans === null) return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Skipped</span>;

  switch (q.question_type) {
    case "mcq_single":
      return `Option ${ans}`;
    case "boolean":
      return ans === true ? "Yes / True" : "No / False";
    case "fraction":
      return `${ans.numerator || 0}/${ans.denominator || 0}`;
    case "ratio":
      return ans.values ? ans.values.join(":") : "N/A";
    case "numeric":
      return `${ans}`;
    case "numeric_with_unit":
      return `${ans.value || 0} ${ans.unit || ""}`;
    default:
      return typeof ans === "object" ? JSON.stringify(ans) : String(ans);
  }
}

function StudentStatsModal({ student, onClose }) {
  const [view, setView] = useState("list"); // 'list' | 'detail'
  const [historyList, setHistoryList] = useState([]);
  // ??$$$
  const [statsSummary, setStatsSummary] = useState({
    totalTests: 0,
    avgScore: 0,
    highScore: 0,
    reattempts: 0,
    totalTimeSeconds: 0
  });
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!student?.id) return;
    fetchStudentHistory();
  }, [student]);

  async function fetchStudentHistory() {
    setLoading(true);
    setError("");
    try {
      const data = await reviewService.getStudentHistory(student.id);
      setHistoryList(data);
      computeStatsSummary(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load student history.");
    } finally {
      setLoading(false);
    }
  }

  // ??$$$
  // Helper to format total seconds into a readable string (e.g. 1h 15m or 45m 12s)
  function formatTotalTime(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds)) return "0s";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  // ??$$$
  // Helper to format actual session time taken
  function formatSessionTime(startedAt, submittedAt) {
    if (!startedAt || !submittedAt) return "-";
    const diffMs = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
    const totalSeconds = Math.max(0, Math.round(diffMs / 1000));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /* old code
  function computeStatsSummary(list) {
    const completed = list.filter(h => h.status === "completed");
    const totalTests = completed.length;
    
    let sumPercentage = 0;
    let highScore = 0;
    const reattempts = completed.filter(h => h.is_reattempt).length;

    completed.forEach(h => {
      const percent = h.total_marks > 0 ? (h.score / h.total_marks) * 100 : 0;
      sumPercentage += percent;
      if (h.score > highScore) {
        highScore = h.score;
      }
    });

    const avgScore = totalTests > 0 ? Math.round(sumPercentage / totalTests) : 0;

    setStatsSummary({
      totalTests,
      avgScore,
      highScore,
      reattempts
    });
  }
  */

  // ??$$$
  function computeStatsSummary(list) {
    const completed = list.filter(h => h.status === "completed");
    const totalTests = completed.length;
    
    let sumPercentage = 0;
    let highScore = 0;
    let totalTimeSeconds = 0;
    const reattempts = completed.filter(h => h.is_reattempt).length;

    completed.forEach(h => {
      const percent = h.total_marks > 0 ? (h.score / h.total_marks) * 100 : 0;
      sumPercentage += percent;
      if (h.score > highScore) {
        highScore = h.score;
      }
      
      // Calculate actual time taken in seconds from start time and submit time
      if (h.started_at && h.submitted_at) {
        const diffMs = new Date(h.submitted_at).getTime() - new Date(h.started_at).getTime();
        totalTimeSeconds += Math.max(0, Math.round(diffMs / 1000));
      }
    });

    const avgScore = totalTests > 0 ? Math.round(sumPercentage / totalTests) : 0;

    setStatsSummary({
      totalTests,
      avgScore,
      highScore,
      reattempts,
      totalTimeSeconds
    });
  }

  const handleViewDetails = async (sessionId) => {
    setLoading(true);
    setError("");
    try {
      const detail = await testApiService.getSessionDetail(sessionId);
      setResultsData(detail);
      setView("detail");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch test session detail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checklist-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="checklist-modal" style={{ maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Header */}
        <div className="checklist-modal-header" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-main)" }}>
              {view === "list" ? `Student Stats: ${student.name}` : `Test Details - Session #${resultsData?.session?.id}`}
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{student.email}</span>
          </div>
          <button onClick={onClose} className="checklist-close" style={{ fontSize: "28px" }}>
            &times;
          </button>
        </div>

        <div className="checklist-modal-body" style={{ padding: "20px 0" }}>
          {error && (
            <div style={{ color: "var(--error-color)", backgroundColor: "#fee2e2", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontWeight: "600", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <div className="loader" style={{ width: "32px", height: "32px", borderWidth: "3px" }}></div>
            </div>
          )}

          {!loading && view === "list" && (
            <div>
              {/* Stats Summary widgets */}
              {/* old code
              <div className="dashboard-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>Tests Taken</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.totalTests}</span>
                </div>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>Avg Score</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.avgScore}%</span>
                </div>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>High Score</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.highScore} pts</span>
                </div>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>Reattempts</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.reattempts}</span>
                </div>
              </div>
              */}

              {/* ??$$$ */}
              <div className="dashboard-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>Tests Taken</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.totalTests}</span>
                </div>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>Avg Score</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.avgScore}%</span>
                </div>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>High Score</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.highScore} pts</span>
                </div>
                <div className="stat-widget" style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span className="stat-widget-label" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)" }}>Reattempts</span>
                  <span className="stat-widget-val" style={{ fontSize: "20px", fontWeight: "700", display: "block", marginTop: "4px" }}>{statsSummary.reattempts}</span>
                </div>
              </div>

              {/* Table of Attempts */}
              <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "var(--text-main)" }}>Test Attempt History</h4>
              
              {historyList.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                  No past test attempts found for this student.
                </div>
              ) : (
                /* old code
                <table className="guide-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>Session ID</th>
                      <th style={{ padding: "10px" }}>Topics</th>
                      <th style={{ padding: "10px" }}>Score</th>
                      <th style={{ padding: "10px" }}>Type</th>
                      <th style={{ padding: "10px" }}>Status</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", color: "var(--text-main)", fontWeight: "600" }}>#{h.id}</td>
                        <td style={{ padding: "10px", color: "var(--text-main)" }}>
                          <span style={{ fontWeight: "600", display: "block" }}>{h.category || "Mixed streams"}</span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{h.difficulty} &bull; {h.total_questions} Qs</span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: "700", color: "#1e293b" }}>
                          {h.status === "completed" ? `${h.score}/${h.total_marks}` : "-"}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span className={`tag tag-category`} style={{ fontSize: "10px", textTransform: "uppercase", backgroundColor: h.is_reattempt ? "#f1f5f9" : "#e0e7ff", color: h.is_reattempt ? "#475569" : "#4f46e5" }}>
                            {h.is_reattempt ? "Reattempt" : "Fresh"}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span className={`tag tag-difficulty ${h.status === 'completed' ? 'basic' : 'advanced'}`} style={{ fontSize: "10px", textTransform: "uppercase" }}>
                            {h.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button
                            onClick={() => handleViewDetails(h.id)}
                            disabled={h.status !== "completed"}
                            className="btn btn-edit"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                */

                // ??$$$
                <table className="guide-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>Session ID</th>
                      <th style={{ padding: "10px" }}>Topics</th>
                      <th style={{ padding: "10px" }}>Score</th>
                      <th style={{ padding: "10px" }}>Time Taken</th>
                      <th style={{ padding: "10px" }}>Type</th>
                      <th style={{ padding: "10px" }}>Status</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", color: "var(--text-main)", fontWeight: "600" }}>#{h.id}</td>
                        <td style={{ padding: "10px", color: "var(--text-main)" }}>
                          <span style={{ fontWeight: "600", display: "block" }}>{h.category || "Mixed streams"}</span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{h.difficulty} &bull; {h.total_questions} Qs</span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: "700", color: "#1e293b" }}>
                          {h.status === "completed" ? `${h.score}/${h.total_marks}` : "-"}
                        </td>
                        <td style={{ padding: "10px", color: "var(--text-main)" }}>
                          {formatSessionTime(h.started_at, h.submitted_at)}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span className={`tag tag-category`} style={{ fontSize: "10px", textTransform: "uppercase", backgroundColor: h.is_reattempt ? "#f1f5f9" : "#e0e7ff", color: h.is_reattempt ? "#475569" : "#4f46e5" }}>
                            {h.is_reattempt ? "Reattempt" : "Fresh"}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span className={`tag tag-difficulty ${h.status === 'completed' ? 'basic' : 'advanced'}`} style={{ fontSize: "10px", textTransform: "uppercase" }}>
                            {h.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          <button
                            onClick={() => handleViewDetails(h.id)}
                            disabled={h.status !== "completed"}
                            className="btn btn-edit"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loading && view === "detail" && resultsData && (
            <div>
              {/* Back button */}
              <button 
                onClick={() => setView("list")} 
                className="btn btn-edit" 
                style={{ marginBottom: "20px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
              >
                &larr; Back to History List
              </button>

              {/* Stats Breakdown cards */}
              <div className="stats-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div className="stats-card score" style={{ padding: "14px", borderRadius: "10px", backgroundColor: "#e0e7ff", border: "1px solid #c7d2fe" }}>
                  <span className="stats-card-label" style={{ fontSize: "10px", textTransform: "uppercase", color: "#4f46e5", display: "block" }}>Final Score</span>
                  <span className="stats-card-value" style={{ fontSize: "18px", fontWeight: "800", color: "#1e1b4b" }}>{resultsData.session.score} / {resultsData.session.total_marks}</span>
                </div>
                <div className="stats-card correct" style={{ padding: "14px", borderRadius: "10px", backgroundColor: "#d1fae5", border: "1px solid #a7f3d0" }}>
                  <span className="stats-card-label" style={{ fontSize: "10px", textTransform: "uppercase", color: "#059669", display: "block" }}>Correct</span>
                  <span className="stats-card-value" style={{ fontSize: "18px", fontWeight: "800", color: "#064e3b" }}>{resultsData.session.correct_count}</span>
                </div>
                <div className="stats-card wrong" style={{ padding: "14px", borderRadius: "10px", backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }}>
                  <span className="stats-card-label" style={{ fontSize: "10px", textTransform: "uppercase", color: "#dc2626", display: "block" }}>Incorrect</span>
                  <span className="stats-card-value" style={{ fontSize: "18px", fontWeight: "800", color: "#7f1d1d" }}>{resultsData.session.wrong_count}</span>
                </div>
                <div className="stats-card skipped" style={{ padding: "14px", borderRadius: "10px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1" }}>
                  <span className="stats-card-label" style={{ fontSize: "10px", textTransform: "uppercase", color: "#475569", display: "block" }}>Skipped</span>
                  <span className="stats-card-value" style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>{resultsData.session.skipped_count}</span>
                </div>
              </div>

              {/* Detailed answers review */}
              <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-main)" }}>Question-by-Question Response Review</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {resultsData.questions.map((q, idx) => {
                  let badgeText = "Skipped";
                  let badgeBg = "#f1f5f9";
                  let badgeColor = "#475569";
                  
                  if (q.is_correct === true) {
                    badgeText = "Correct";
                    badgeBg = "#d1fae5";
                    badgeColor = "#064e3b";
                  } else if (q.is_correct === false) {
                    badgeText = "Incorrect";
                    badgeBg = "#fee2e2";
                    badgeColor = "#7f1d1d";
                  }

                  return (
                    <div key={q.id} className="review-question-card" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "12px", backgroundColor: "#ffffff" }}>
                      <div className="review-card-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "700" }}>Question {idx + 1}</span>
                        <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", backgroundColor: badgeBg, color: badgeColor }}>
                          {badgeText}
                        </span>
                      </div>

                      {q.passage && (
                        <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", borderLeft: "4px solid #cbd5e1" }}>
                          {q.passage}
                        </div>
                      )}

                      {q.data_block && q.data_block.markdown && (
                        <div style={{ marginBottom: "12px" }}>
                          {renderMarkdownTable(q.data_block.markdown)}
                        </div>
                      )}

                      <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-main)", marginBottom: "12px" }}>
                        {q.question_text}
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          {q.options.map((opt) => {
                            const isUserSelection = q.user_answer === opt.key;
                            return (
                              <div key={opt.key} style={{ padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", backgroundColor: isUserSelection ? "#e0e7ff" : "transparent", borderColor: isUserSelection ? "#818cf8" : "var(--border-color)" }}>
                                <strong style={{ color: "#4f46e5", marginRight: "6px" }}>{opt.key}:</strong>
                                <span>{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "20px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>
                        <div>
                          <strong>Student Answer:</strong> {renderUserAnswer(q)}
                        </div>
                        <div>
                          <strong>Correct Answer:</strong> <span style={{ color: "#16a34a", fontWeight: "700" }}>{renderCorrectAnswer(q)}</span>
                        </div>
                      </div>

                      {q.solution && (
                        <div style={{ padding: "12px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "13px", color: "#1e3a8a" }}>
                          <strong>Solution Explanation:</strong>
                          <div style={{ whiteSpace: "pre-wrap", marginTop: "4px", lineHeight: "1.5" }}>
                            {q.solution}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-checklist-cancel" style={{ padding: "8px 16px" }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default StudentStatsModal;
