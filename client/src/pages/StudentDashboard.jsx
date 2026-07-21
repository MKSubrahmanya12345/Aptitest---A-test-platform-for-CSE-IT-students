import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { testApiService } from "../services/test.service";
import "../styles/student.css";


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
    return <pre className="whitespace-pre-wrap monospace-field">{markdown}</pre>;
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
  if (ans === undefined || ans === null) return <span className="skipped-answer-text">Skipped</span>;

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

function StudentDashboard() {
  const navigate = useNavigate();
  
  // Auth state
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  // App layouts: 'dashboard' | 'history' | 'leaderboard' | 'test_environment' | 'results'
  const [currentView, setCurrentView] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  //states for hamburger menu for mobile css
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Checklist Modal State
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showBannedModal, setShowBannedModal] = useState(false); // ??$$$
  const [selectedTemplate, setSelectedTemplate] = useState(null); // { name, difficulty, count, duration }
  const [categoriesList] = useState([
    "Quantitative Aptitude",
    "Logical Reasoning",
    "Verbal Ability",
    "Data Interpretation and Analysis",
    "Abstract Reasoning",
    "Technical Aptitude"
  ]);
  const [checkedCategories, setCheckedCategories] = useState(
    ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Data Interpretation and Analysis", "Abstract Reasoning", "Technical Aptitude"]
  );

  // Active test taking state
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: answer_value }
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [savingAnswer, setSavingAnswer] = useState(false);

  // Results state
  const [resultsData, setResultsData] = useState(null);

  // History & Leaderboard lists
  const [historyList, setHistoryList] = useState([]);
  const [leaderboardList, setLeaderboardList] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState("easy_30"); // 'easy_30' | 'easy_60' | 'hard_30' | 'hard_60'

  // Summary widgets state (calculated from history)
  const [statsSummary, setStatsSummary] = useState({
    totalTests: 0,
    avgScore: 0,
    highScore: 0,
    reattempts: 0
  });

  // 4 Test Templates
  const testTemplates = [
    {
      id: "easy_30",
      name: "Easy Practice - 30 Qs",
      desc: "Perfect for quick basic revision. Covers easy level questions across chosen streams.",
      difficulty: "easy",
      count: 30,
      duration: 30 // minutes
    },
    {
      id: "easy_60",
      name: "Easy Practice - 60 Qs",
      desc: "Full length foundation practice. Ideal for building solid speed and accuracy.",
      difficulty: "easy",
      count: 60,
      duration: 60 // minutes
    },
    {
      id: "hard_30",
      name: "Hard Practice - 30 Qs",
      desc: "Challenging intermediate and advanced tasks designed to test logical limits.",
      difficulty: "hard",
      count: 30,
      duration: 30 // minutes
    },
    {
      id: "hard_60",
      name: "Hard Practice - 60 Qs",
      desc: "Complete advanced simulation. Designed to stress test your skill stamina.",
      difficulty: "hard",
      count: 60,
      duration: 60 // minutes
    }
  ];


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || user.role !== "student") {
      localStorage.clear();
      navigate("/login");
    } else {
      fetchHistoryDataSilently();
      if (user.status === "banned") {
        setShowBannedModal(true);
      }
    }
  }, [navigate, user]);

  // Load history list when tab switches
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || user.role !== "student") return;

    if (currentView === "history") {
      fetchHistory();
    } else if (currentView === "dashboard") {
      fetchHistoryDataSilently();
    }
  }, [currentView]);

  // Load leaderboard when tab or ranking type switches
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || user.role !== "student") return;

    if (currentView === "leaderboard") {
      fetchLeaderboard();
    }
  }, [currentView, leaderboardType]);

  // Sync server side countdown timer
  useEffect(() => {
    if (!activeSession || currentView !== "test_environment") return;
    
    const expiry = new Date(activeSession.server_expires_at).getTime();
    const remaining = Math.max(0, Math.round((expiry - Date.now()) / 1000));
    setTimeLeft(remaining);

    const timer = setInterval(() => {
      const rem = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setTimeLeft(rem);
      
      if (rem <= 0) {
        clearInterval(timer);
        handleForceSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession, currentView]);


  // Warn user if they try to leave or refresh during test
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentView === "test_environment") {
        e.preventDefault();
        e.returnValue = "You have an active test session! Leaving this page will submit whatever you have answered.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentView]);


  // Mark current question as viewed when the student sees it
  useEffect(() => {
    if (currentView === "test_environment" && activeSession && activeSession.questions) {
      const currentQ = activeSession.questions[currentQuestionIndex];
      if (currentQ) {
        testApiService.markQuestionViewed(activeSession.session_id, currentQ.id)
          .catch(err => console.error("Failed to mark question as viewed:", err));
      }
    }
  }, [currentQuestionIndex, activeSession, currentView]);

  // Fetch History silently to compute statistics
  async function fetchHistoryDataSilently() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const data = await testApiService.getHistory();
      setHistoryList(data);
      computeStatsSummary(data);
    } catch (err) {
      console.error("Silent stats fetch failed:", err);
    }
  }

  // Calculate statistics from attempt list
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


  // Calculate category-wise analysis for strengths & weaknesses (A for student)
  function computeCategoryAnalysis(list) {
    const completed = list.filter(h => h.status === "completed" && h.category);
    const categoryMap = {};

    completed.forEach(h => {
      if (!categoryMap[h.category]) {
        categoryMap[h.category] = {
          category: h.category,
          correct: 0,
          total: 0,
          duration: 0,
          attempts: 0
        };
      }
      categoryMap[h.category].correct += h.correct_count || 0;
      categoryMap[h.category].total += h.total_questions || 0;
      categoryMap[h.category].duration += h.duration_seconds || 0;
      categoryMap[h.category].attempts += 1;
    });

    return Object.values(categoryMap).map(c => {
      const accuracy = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
      const avgTimePerQ = c.total > 0 ? Math.round(c.duration / c.total) : 0;
      return {
        category: c.category,
        accuracy,
        avgTimePerQ,
        attempts: c.attempts,
        status: accuracy >= 70 ? "strength" : (accuracy < 50 ? "weakness" : "developing")
      };
    });
  }

  // API Call: Fetch History
  async function fetchHistory() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await testApiService.getHistory();
      setHistoryList(data);
      computeStatsSummary(data);
    } catch (err) {
      setError("Failed to load attempt history.");
    } finally {
      setLoading(false);
    }
  }

  // API Call: Fetch Leaderboard
  async function fetchLeaderboard() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await testApiService.getLeaderboard(leaderboardType);
      setLeaderboardList(data);
    } catch (err) {
      setError("Failed to load leaderboard rankings.");
    } finally {
      setLoading(false);
    }
  }


  // Action: Open Checklist Modal for a test template
  const handleLaunchChecklist = (template) => {
    if (user.status === "banned") {
      setShowBannedModal(true);
      return;
    }
    setSelectedTemplate(template);
    // Reset checked categories to all checked
    setCheckedCategories([...categoriesList]);
    setShowChecklistModal(true);
  };

  // Toggle Category checked status
  const handleToggleCategory = (category) => {
    if (checkedCategories.includes(category)) {
      setCheckedCategories(checkedCategories.filter(c => c !== category));
    } else {
      setCheckedCategories([...checkedCategories, category]);
    }
  };

  // Select all categories helper
  const handleSelectAllCategories = () => {
    setCheckedCategories([...categoriesList]);
  };

  // Deselect all categories helper
  const handleDeselectAllCategories = () => {
    setCheckedCategories([]);
  };

  // Action: Launch Test with chosen categories
  const handleStartTest = async () => {
    if (!selectedTemplate) return;
    if (checkedCategories.length === 0) {
      alert("Please select at least one stream/category to include in the test.");
      return;
    }

    setLoading(true);
    setError("");
    setShowChecklistModal(false);
    
    try {
      const apiPayload = {
        categories: checkedCategories,
        difficulty: selectedTemplate.difficulty,
        count: selectedTemplate.count,
        duration_seconds: selectedTemplate.duration * 60
      };

      const data = await testApiService.startTest(apiPayload);
      
      // Initialize state for test taking
      setActiveSession(data);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setFlaggedQuestions(new Set());
      setCurrentView("test_environment");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to start test session.");
    } finally {
      setLoading(false);
    }
  };

  // Action: Save answers
  const handleSelectOption = async (qId, optionKey) => {
    const updatedAnswers = { ...answers, [qId]: optionKey };
    setAnswers(updatedAnswers);
    await saveAnswerToServer(qId, optionKey);
  };

  const handleFractionChange = (qId, field, val) => {
    const current = answers[qId] || { numerator: "", denominator: "" };
    const updated = { ...current, [field]: val === "" ? "" : parseInt(val) };
    setAnswers({ ...answers, [qId]: updated });
  };

  const handleRatioChange = (qId, index, val) => {
    const current = answers[qId] || { values: ["", ""] };
    const updatedValues = [...current.values];
    updatedValues[index] = val === "" ? "" : parseInt(val);
    const updated = { values: updatedValues };
    setAnswers({ ...answers, [qId]: updated });
  };

  const handleNumericWithUnitChange = (qId, field, val) => {
    const current = answers[qId] || { value: "", unit: "" };
    const updated = { ...current, [field]: field === "value" ? (val === "" ? "" : parseFloat(val)) : val };
    setAnswers({ ...answers, [qId]: updated });
  };

  const handleTextChange = (qId, val) => {
    setAnswers({ ...answers, [qId]: val });
  };

  const handleSaveCurrentAnswer = async (qId) => {
    const ans = answers[qId];
    if (ans !== undefined) {
      await saveAnswerToServer(qId, ans);
    }
  };

  const saveAnswerToServer = async (qId, ansVal) => {
    if (!activeSession) return;
    setSavingAnswer(true);
    try {
      await testApiService.saveAnswer(activeSession.session_id, qId, ansVal);
    } catch (err) {
      console.error("Save answer failed:", err);
    } finally {
      setSavingAnswer(false);
    }
  };

  // Toggle flagged questions
  const toggleFlagQuestion = (qId) => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(qId)) {
      newFlagged.delete(qId);
    } else {
      newFlagged.add(qId);
    }
    setFlaggedQuestions(newFlagged);
  };

  // Submit test manually
  const handleSubmitTest = async () => {
    if (!activeSession) return;
    if (!window.confirm("Are you sure you want to finish and submit this test?")) return;
    
    setLoading(true);
    setError("");
    try {
      await testApiService.submitTest(activeSession.session_id);
      const detail = await testApiService.getSessionDetail(activeSession.session_id);
      setResultsData(detail);
      setCurrentView("results");
      setActiveSession(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit test.");
    } finally {
      setLoading(false);
    }
  };

  // Force auto-submit
  const handleForceSubmit = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await testApiService.submitTest(activeSession.session_id);
      const detail = await testApiService.getSessionDetail(activeSession.session_id);
      setResultsData(detail);
      setCurrentView("results");
      setActiveSession(null);
      alert("Time is up! Your test has been submitted automatically.");
    } catch (err) {
      setError("Failed to auto-submit expired test session.");
    } finally {
      setLoading(false);
    }
  };

  // View Results breakdown
  const handleViewResults = async (sessionId) => {
    setLoading(true);
    setError("");
    try {
      const detail = await testApiService.getSessionDetail(sessionId);
      setResultsData(detail);
      setCurrentView("results");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch session detail.");
    } finally {
      setLoading(false);
    }
  };

  // Reattempt Test (Stats no update because counts_for_stats will be false)
  const handleReattempt = async (sessionId) => {
    if (user.status === "banned") {
      setShowBannedModal(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await testApiService.reattempt(sessionId);
      setActiveSession(data);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setFlaggedQuestions(new Set());
      setCurrentView("test_environment");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to start reattempt session.");
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setSidebarOpen(false);
    localStorage.clear();
    navigate("/login");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ??$$$
  // Helper to format average time taken per correct question
  const formatTimePerCorrect = (seconds) => {
    if (!seconds || seconds <= 0 || seconds >= 999999) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s/q`;
    }
    return `${secs}s/q`;
  };

  return (
    <div className="student-dashboard-container">

      <div className="mobile-header">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <h2>AptiTest Hub</h2>
      </div>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      {currentView !== "test_environment" && (
        <div
          className={`student-sidebar ${
            sidebarOpen ? "open" : ""
          }`}
        >
          <div className="sidebar-header">
            <span>AptiTest Hub</span>
          </div>


          <div className="sidebar-user">
            <div className="user-avatar-circle">
              {user.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name || "Student"}</span>
              <span className="user-role">{user.role || "student"}</span>
            </div>
          </div>

          <div className="sidebar-nav">
            <button
              onClick={() => {
                setCurrentView("dashboard");
                setSidebarOpen(false);
              }}
              className={`nav-link ${currentView === "dashboard" ? "active" : ""}`}
            >
              🏠 Dashboard Home
            </button>
            <button
              onClick={() => {
                setCurrentView("history");
                setSidebarOpen(false);
              }}
              className={`nav-link ${currentView === "history" ? "active" : ""}`}
            >
              📅 Attempt History
            </button>
            <button
              onClick={() => {
                setCurrentView("leaderboard");
                setSidebarOpen(false);
              }}
              className={`nav-link ${currentView === "leaderboard" ? "active" : ""}`}
            >
              🏆 Rank Leaderboards
            </button>
          </div>

          <div className="sidebar-footer">
            <button onClick={handleLogout} className="logout-button">
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="student-main">
        {/* Header bar */}
        <div className="student-header">
          <h1>
            {currentView === "dashboard" && "Student Hub"}
            {currentView === "history" && "My Past Attempts"}
            {currentView === "leaderboard" && "Global Rankings"}
            {currentView === "test_environment" && `Practice Test - In Progress`}
            {currentView === "results" && "Test Attempt Results"}
          </h1>
          {currentView === "test_environment" && activeSession && (
            <>

              <div className="flex-align-center-gap-12">
                <span className="session-id-text">
                  Session ID: #{activeSession.session_id}
                </span>
                {savingAnswer && (
                  <span className="loader loader-mini"></span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Content area */}
        <div className="student-content">
          {error && (
            <>

              <div className="alert-banner-error">
                {error}
              </div>
            </>
          )}

          {/* Loader */}
          {loading && currentView !== "test_environment" && (
            <div className="loader-container">
              <div className="loader"></div>
            </div>
          )}

          {/* 1. DASHBOARD VIEW (Basic Dashboard first) */}
          {!loading && currentView === "dashboard" && (
            <div>
              {/* ??$$$ */}
              {user.status === 'banned' && (
                <>

                  <div className="banned-banner">
                    <h3 className="banned-banner-title">⚠️ Account Banned</h3>
                    <p className="banned-banner-desc">
                      Your account has been banned. You cannot attempt new tests or reattempt past tests. 
                      However, you can still access your previous test records, results detail, and the leaderboards.
                    </p>
                  </div>
                </>
              )}

              {/* Welcome Banner */}
              <div className="dashboard-welcome">
                <h2>Welcome back, {user.name || "Student"}!</h2>
                <p>
                  Accelerate your aptitude preparation. Select one of the practice templates below, customize your topic coverage via the stream checklist, and jump right into the practice test environment.
                </p>
              </div>

              {/* Stats Widgets */}
              <div className="dashboard-stats-grid">
                <div className="stat-widget">
                  <span className="stat-widget-label">Total Tests Taken</span>
                  <span className="stat-widget-val">{statsSummary.totalTests}</span>
                </div>
                <div className="stat-widget">
                  <span className="stat-widget-label">Average Score</span>
                  <span className="stat-widget-val">{statsSummary.avgScore}%</span>
                </div>
                <div className="stat-widget">
                  <span className="stat-widget-label">High Score</span>
                  <span className="stat-widget-val">{statsSummary.highScore} pts</span>
                </div>
                <div className="stat-widget">
                  <span className="stat-widget-label">Reattempt Count</span>
                  <span className="stat-widget-val">{statsSummary.reattempts}</span>
                </div>
              </div>

              {/* Practice Test Templates */}
              <h3 className="section-title">🚀 Launch Practice Test Session</h3>
              <div className="test-templates-grid">
                {testTemplates.map((template) => (
                  <div key={template.id} className="template-card">
                    <div>
                      <span className={`template-badge ${template.difficulty}`}>
                        {template.difficulty}
                      </span>
                      <h4 className="template-title">{template.name}</h4>
                      <p className="template-desc">{template.desc}</p>
                      
                      <div className="template-meta-row">
                        <span className="template-meta-item">
                          ❓ {template.count} Questions
                        </span>
                        <span className="template-meta-item">
                          ⏱️ {template.duration} Minutes
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchChecklist(template)}
                      className="btn-launch-template"
                    >
                      Select Topics & Launch Test
                    </button>
                  </div>
                ))}
              </div>

              {/* ??$$$ */}
              {/* Strengths & Weaknesses (A for student) */}
              {(() => {
                const categoryAnalysis = computeCategoryAnalysis(historyList);
                if (categoryAnalysis.length === 0) return null;
                return (
                  <div style={{ marginTop: '40px' }}>
                    <h3 className="section-title">📊 Topic Performance Breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      {categoryAnalysis.map((cat, idx) => {
                        let statusText = "Developing";
                        let badgeColor = "#3b82f6";
                        let badgeBg = "#eff6ff";
                        
                        if (cat.status === "strength") {
                          statusText = "Strength 🏆";
                          badgeColor = "#10b981";
                          badgeBg = "#ecfdf5";
                        } else if (cat.status === "weakness") {
                          statusText = "Weakness ⚠️";
                          badgeColor = "#ef4444";
                          badgeBg = "#fef2f2";
                        }

                        return (
                          <div 
                            key={idx} 
                            className="template-card" 
                            style={{ 
                              padding: '24px', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              justifyContent: 'space-between',
                              borderLeft: `5px solid ${badgeColor}`
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h4 style={{ margin: 0, fontSize: '16.5px', fontWeight: '800', color: '#0f172a', fontFamily: 'var(--font-family-display)' }}>{cat.category}</h4>
                                <span 
                                  style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '11px', 
                                    fontWeight: '800', 
                                    color: badgeColor, 
                                    backgroundColor: badgeBg,
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {statusText}
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Accuracy:</span>
                                  <span style={{ fontWeight: '700', color: cat.status === 'strength' ? '#10b981' : (cat.status === 'weakness' ? '#ef4444' : '#3b82f6') }}>{cat.accuracy}%</span>
                                </div>
                                
                                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${cat.accuracy}%`, height: '100%', backgroundColor: badgeColor, borderRadius: '3px' }} />
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                  <span>Avg Time per Question:</span>
                                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{cat.avgTimePerQ}s</span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Attempts:</span>
                                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{cat.attempts} test{cat.attempts > 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 2. CATEGORY CHECKLIST MODAL */}
          {showChecklistModal && selectedTemplate && (
            <div className="checklist-modal-overlay">
              <div className="checklist-modal">
                <div className="checklist-modal-header">
                  <h3>Select Streams for: {selectedTemplate.name}</h3>
                  <button onClick={() => setShowChecklistModal(false)} className="checklist-close">
                    &times;
                  </button>
                </div>

                <div className="checklist-modal-body">
                  <p className="checklist-instructions">
                    Check the aptitude topics you want to practice. The session will randomly select questions only from the selected streams.
                  </p>

                  <div className="checklist-actions-header">
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="btn-history-action view btn-small"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllCategories}
                      className="btn-history-action view btn-deselect-all"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="categories-checklist">
                    {categoriesList.map((category) => {
                      const isChecked = checkedCategories.includes(category);
                      return (
                        <div
                          key={category}
                          onClick={() => handleToggleCategory(category)}
                          className={`checklist-item ${isChecked ? "checked" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by row click
                          />
                          <span className="checklist-item-label">{category}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="checklist-actions">
                    <button
                      onClick={() => setShowChecklistModal(false)}
                      className="btn-checklist-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStartTest}
                      disabled={checkedCategories.length === 0}
                      className="btn-checklist-start"
                    >
                      Start Test Attempt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ??$$$ */}
          {showBannedModal && (
            <>

              <div className="checklist-modal-overlay z-index-high">
                <div className="checklist-modal banned-modal-width">
                  <div className="checklist-modal-header border-bottom-none">
                    <h3 className="banned-modal-header-title">
                      ⚠️ Account Banned
                    </h3>
                    <button onClick={() => setShowBannedModal(false)} className="checklist-close">
                      &times;
                    </button>
                  </div>
                  <div className="banned-modal-body">
                    <p className="banned-modal-paragraph-main">
                      Your account is currently banned. You are restricted from starting new tests or reattempting past tests.
                    </p>
                    <p className="banned-modal-paragraph-muted">
                      You may still browse your previous test histories, view details of completed sessions, and check rank leaderboards.
                    </p>
                    <div className="flex-justify-end-mt-8">
                      <button
                        onClick={() => setShowBannedModal(false)}
                        className="btn-checklist-start btn-banned-understand"
                      >
                        Understood
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3. ACTIVE TEST ENVIRONMENT */}
          {currentView === "test_environment" && activeSession && (
            <div className="test-layout">
              {/* Left Sidebar */}
              <div className="test-sidebar">
                <div className="timer-box">
                  <div className="timer-label">Time Remaining</div>
                  <div className={`timer-value ${timeLeft <= 60 ? "danger" : ""}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                <div className="question-grid-title">Question Navigator</div>
                <div className="question-grid">
                  {activeSession.questions.map((q, idx) => {
                    let btnClass = "grid-btn";
                    if (idx === currentQuestionIndex) {
                      btnClass += " active";
                    } else if (flaggedQuestions.has(q.id)) {
                      btnClass += " flagged";
                    } else if (answers[q.id] !== undefined && answers[q.id] !== "") {
                      const ansVal = answers[q.id];
                      const isEmpty = ansVal === null || 
                                      (typeof ansVal === "object" && Object.keys(ansVal).length === 0) ||
                                      (typeof ansVal === "object" && ansVal.numerator === "" && ansVal.denominator === "") ||
                                      (typeof ansVal === "object" && ansVal.values && ansVal.values[0] === "" && ansVal.values[1] === "") ||
                                      (typeof ansVal === "object" && ansVal.value === "" && ansVal.unit === "");
                      if (!isEmpty) {
                        btnClass += " answered";
                      }
                    }
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={btnClass}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="test-sidebar-bottom-actions">
                  <div className="sidebar-hint-text">
                    🔒 Answers are secured and saved automatically to the server on input change or navigator shift.
                  </div>
                  <button onClick={handleSubmitTest} className="btn-submit-test w-100">
                    Finish & Submit Test
                  </button>
                </div>
              </div>

              {/* Main Panel: Question Detail */}
              <div className="test-main-content">
                {(() => {
                  const q = activeSession.questions[currentQuestionIndex];
                  if (!q) return <div>Loading question details...</div>;

                  return (
                    <>
                      <div className="test-info-header">
                        <h2>Question {currentQuestionIndex + 1} of {activeSession.questions.length}</h2>
                        <div className="question-meta">
                          <span className="tag tag-category">{q.category}</span>
                          <span className={`tag tag-difficulty ${q.difficulty}`}>
                            {q.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="question-body-scroller">
                        {/* Passage block */}
                        {q.passage && (
                          <div className="passage-section">
                            <strong>Passage:</strong><br />
                            {q.passage}
                          </div>
                        )}

                        {/* Dataset block */}
                        {q.data_block && q.data_block.markdown && (
                          <div>
                            <strong>Dataset:</strong>
                            {renderMarkdownTable(q.data_block.markdown)}
                          </div>
                        )}

                        {/* Question Text */}
                        <div className="question-text-display">
                          {q.question_text}
                        </div>

                        <div className="mt-24">
                          <strong className="input-title-label">
                            Select or Enter Your Answer:
                          </strong>

                          {/* MCQ SINGLE */}
                          {q.question_type === "mcq_single" && q.options && (
                            <div className="options-list-student">
                              {q.options.map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  className={`option-btn-student ${answers[q.id] === opt.key ? "selected" : ""}`}
                                  onClick={() => handleSelectOption(q.id, opt.key)}
                                >
                                  <span className="option-badge-student">{opt.key}</span>
                                  <span>{opt.text}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* BOOLEAN */}
                          {q.question_type === "boolean" && (
                            <div className="options-list-student">
                              <button
                                type="button"
                                className={`option-btn-student ${answers[q.id] === true ? "selected" : ""}`}
                                onClick={() => handleSelectOption(q.id, true)}
                              >
                                <span className="option-badge-student">Y</span>
                                <span>Yes / True</span>
                              </button>
                              <button
                                type="button"
                                className={`option-btn-student ${answers[q.id] === false ? "selected" : ""}`}
                                onClick={() => handleSelectOption(q.id, false)}
                              >
                                <span className="option-badge-student">N</span>
                                <span>No / False</span>
                              </button>
                            </div>
                          )}

                          {/* FRACTION */}
                          {q.question_type === "fraction" && (
                            <div className="fraction-inputs">
                              <input
                                type="number"
                                className="fraction-input-box"
                                placeholder="Num"
                                value={answers[q.id]?.numerator !== undefined ? answers[q.id].numerator : ""}
                                onChange={(e) => handleFractionChange(q.id, "numerator", e.target.value)}
                                onBlur={() => handleSaveCurrentAnswer(q.id)}
                              />
                              <span style={{ fontSize: "24px", fontWeight: "600" }}>/</span>
                              <input
                                type="number"
                                className="fraction-input-box"
                                placeholder="Den"
                                value={answers[q.id]?.denominator !== undefined ? answers[q.id].denominator : ""}
                                onChange={(e) => handleFractionChange(q.id, "denominator", e.target.value)}
                                onBlur={() => handleSaveCurrentAnswer(q.id)}
                              />
                            </div>
                          )}

                          {/* RATIO */}
                          {q.question_type === "ratio" && (
                            <div className="ratio-inputs">
                              <input
                                type="number"
                                className="ratio-input-box"
                                placeholder="Val 1"
                                value={answers[q.id]?.values?.[0] !== undefined ? answers[q.id].values[0] : ""}
                                onChange={(e) => handleRatioChange(q.id, 0, e.target.value)}
                                onBlur={() => handleSaveCurrentAnswer(q.id)}
                              />
                              <span style={{ fontSize: "24px", fontWeight: "600" }}>:</span>
                              <input
                                type="number"
                                className="ratio-input-box"
                                placeholder="Val 2"
                                value={answers[q.id]?.values?.[1] !== undefined ? answers[q.id].values[1] : ""}
                                onChange={(e) => handleRatioChange(q.id, 1, e.target.value)}
                                onBlur={() => handleSaveCurrentAnswer(q.id)}
                              />
                            </div>
                          )}

                          {/* NUMERIC & DATA INTERPRETATION & NUMERIC WITH UNIT */}
                          {(q.question_type === "numeric" || q.question_type === "numeric_with_unit" || q.question_type === "data_interpretation") && (
                            <>

                            <div className="flex-align-center-gap-12">
                              <input
                                type="number"
                                step="any"
                                className="student-input-text w-max-250"
                                placeholder="Enter numeric value"
                                value={
                                  q.question_type === "numeric_with_unit" 
                                    ? (answers[q.id]?.value !== undefined ? answers[q.id].value : "")
                                    : (answers[q.id] !== undefined ? answers[q.id] : "")
                                }
                                onChange={(e) => {
                                  if (q.question_type === "numeric_with_unit") {
                                    handleNumericWithUnitChange(q.id, "value", e.target.value);
                                  } else {
                                    handleTextChange(q.id, e.target.value);
                                  }
                                }}
                                onBlur={() => handleSaveCurrentAnswer(q.id)}
                              />
                              {q.question_type === "numeric_with_unit" && (
                                <input
                                  type="text"
                                  className="student-input-text w-max-120"
                                  placeholder="Unit (e.g. m)"
                                  value={answers[q.id]?.unit !== undefined ? answers[q.id].unit : ""}
                                  onChange={(e) => handleNumericWithUnitChange(q.id, "unit", e.target.value)}
                                  onBlur={() => handleSaveCurrentAnswer(q.id)}
                                />
                              )}
                            </div>
                          </>)}

                          {/* TEXT & SHORT CODES */}
                          {q.question_type !== "mcq_single" && 
                           q.question_type !== "boolean" && 
                           q.question_type !== "fraction" && 
                           q.question_type !== "ratio" && 
                           q.question_type !== "numeric" && 
                           q.question_type !== "numeric_with_unit" && (
                            <textarea
                              className="student-input-text"
                              rows={3}
                              placeholder="Type your answer text here..."
                              value={answers[q.id] !== undefined ? answers[q.id] : ""}
                              onChange={(e) => handleTextChange(q.id, e.target.value)}
                              onBlur={() => handleSaveCurrentAnswer(q.id)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Footer Navigator buttons */}
                      <div className="test-footer">
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                          className="btn-nav-action"
                          disabled={currentQuestionIndex === 0}
                        >
                          ⬅️ Previous
                        </button>


                        <button
                          type="button"
                          onClick={() => toggleFlagQuestion(q.id)}
                          className={`btn-nav-action ${flaggedQuestions.has(q.id) ? "flagged-active" : ""}`}
                        >
                          🏳️ Flag for Review
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSaveCurrentAnswer(q.id);
                            if (currentQuestionIndex < activeSession.questions.length - 1) {
                              setCurrentQuestionIndex(currentQuestionIndex + 1);
                            }
                          }}
                          className="btn-nav-action"
                          disabled={currentQuestionIndex === activeSession.questions.length - 1}
                        >
                          Save & Next ➡️
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 4. RESULTS REVIEW VIEW */}
          {!loading && currentView === "results" && resultsData && (
            <div>
              {/* Score Statistics */}
              <div className="stats-summary-grid">
                <div className="stats-card score">
                  <span className="stats-card-label">FINAL SCORE</span>
                  <span className="stats-card-value">{resultsData.session.score} / {resultsData.session.total_marks}</span>
                </div>
                <div className="stats-card correct">
                  <span className="stats-card-label">CORRECT ANSWERS</span>
                  <span className="stats-card-value">{resultsData.session.correct_count}</span>
                </div>
                <div className="stats-card wrong">
                  <span className="stats-card-label">WRONG ANSWERS</span>
                  <span className="stats-card-value">{resultsData.session.wrong_count}</span>
                </div>
                <div className="stats-card skipped">
                  <span className="stats-card-label">SKIPPED QUESTIONS</span>
                  <span className="stats-card-value">{resultsData.session.skipped_count}</span>
                </div>
              </div>

              <div className="results-actions-row">
                <button onClick={() => setCurrentView("dashboard")} className="btn-start-test btn-inline-neutral">
                  Back to Dashboard Home
                </button>
                <button
                  onClick={() => handleReattempt(resultsData.session.id)}
                  className="btn-start-test btn-inline-success"
                >
                  🔄 Reattempt This Test (Stats won't update)
                </button>
              </div>

              {/* Detailed answers review */}
              <h2 className="review-answers-title">Question Review Breakdown</h2>
              <div>
                {resultsData.questions.map((q, idx) => {
                  let badgeText = "Skipped";
                  let badgeClass = "status-badge skipped";
                  
                  if (q.is_correct === true) {
                    badgeText = "Correct";
                    badgeClass = "status-badge correct";
                  } else if (q.is_correct === false) {
                    badgeText = "Incorrect";
                    badgeClass = "status-badge wrong";
                  }

                  return (
                    <div key={q.id} className="review-question-card">

                      <div className="review-card-header">
                        <h3 className="review-card-title">Question {idx + 1}</h3>
                        <span className={badgeClass}>{badgeText}</span>
                      </div>

                      {q.passage && (
                        <div className="passage-section mb-16">
                          {q.passage}
                        </div>
                      )}

                      {q.data_block && q.data_block.markdown && (
                        <div className="mb-16">
                          {renderMarkdownTable(q.data_block.markdown)}
                        </div>
                      )}

                      <div className="question-text-display fs-16 mb-16">
                        {q.question_text}
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="options-grid mb-16">
                          {q.options.map((opt) => {
                            let itemStyle = "option-item";
                            if (q.user_answer === opt.key) {
                              itemStyle += " option-btn-student selected";
                            }
                            return (
                              <div key={opt.key} className={`${itemStyle} review-option-item`}>
                                <strong className="primary-text">{opt.key}:</strong>
                                <span>{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}


                      <div className="answer-comparison-box">
                        <div>
                          <strong>Your Submitted Answer:</strong> {renderUserAnswer(q)}
                        </div>
                        <div>
                          <strong>Correct Answer:</strong> <span className="correct-answer-text">{renderCorrectAnswer(q)}</span>
                        </div>
                      </div>

                      {q.solution && (
                        <div className="solution-box-student">
                          <strong>Solution Explanation:</strong>
                          <div className="solution-text-display">
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

          {/* 5. ATTEMPT HISTORY VIEW */}
          {!loading && currentView === "history" && (
            <div className="history-table-container">
              {historyList.length === 0 ? (
                <>

                <div className="history-empty-state">
                  No past test attempts found. Choose a practice template on the Dashboard to get started!
                </div>
              </>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Attempt ID</th>
                      <th>Category streams</th>
                      <th>Score</th>
                      <th>Date</th>
                      <th>Attempt Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h) => (
                      <tr key={h.id}>
                        <td>#{h.id}</td>
                        <td>

                          <div className="font-bold">{h.category || "Mixed streams"}</div>
                        </td>
                        <td>

                          {h.status === "completed" ? (
                            <strong className="score-value font-bold">
                              {h.score} / {h.total_marks}
                            </strong>
                          ) : (
                            <span className="color-muted-text">--</span>
                          )}
                        </td>
                        <td>{new Date(h.started_at).toLocaleDateString()}</td>
                        <td>

                          {h.is_reattempt ? (
                            <span className="tag-reattempt">
                              Reattempt
                            </span>
                          ) : (
                            <span className="tag-fresh">
                              Fresh
                            </span>
                          )}
                        </td>
                        <td>
 
                          <span
                            className={h.status === "completed" ? "tag-status-completed" : "tag-status-pending"}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td>

                          <button
                            onClick={() => handleViewResults(h.id)}
                            className={`btn-history-action view ${h.status !== "completed" ? "opacity-50" : ""}`}
                            disabled={h.status !== "completed"}
                          >
                            Review breakdown
                          </button>
                          <button
                            onClick={() => handleReattempt(h.id)}
                            className="btn-history-action reattempt"
                            disabled={h.status !== "completed"}
                          >
                            Reattempt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 6. GLOBAL RANK LEADERBOARDS (4 types of ranking based on tests) */}
          {!loading && currentView === "leaderboard" && (
            <div>
              {/* 4 Ranking toggles */}
              <div className="ranking-toggle-container">
                <button
                  onClick={() => setLeaderboardType("easy_30")}
                  className={`ranking-toggle-btn ${leaderboardType === "easy_30" ? "active" : ""}`}
                >
                  Easy - 30 Qs
                </button>
                <button
                  onClick={() => setLeaderboardType("easy_60")}
                  className={`ranking-toggle-btn ${leaderboardType === "easy_60" ? "active" : ""}`}
                >
                  Easy - 60 Qs
                </button>
                <button
                  onClick={() => setLeaderboardType("hard_30")}
                  className={`ranking-toggle-btn ${leaderboardType === "hard_30" ? "active" : ""}`}
                >
                  Hard - 30 Qs
                </button>
                <button
                  onClick={() => setLeaderboardType("hard_60")}
                  className={`ranking-toggle-btn ${leaderboardType === "hard_60" ? "active" : ""}`}
                >
                  Hard - 60 Qs
                </button>
              </div>

              <div className="leaderboard-container">
                {leaderboardList.length === 0 ? (
                  <>

                    <div className="leaderboard-empty-state">
                      No ranked participants for this test template yet. Be the first to build a score!
                    </div>
                  </>
                ) : (
                  <>

                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="w-80">Rank</th>
                        <th>Student Name</th>
                        <th className="text-right">Correct Answers</th>
                        <th className="text-right">Avg Time / Correct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardList.map((row) => {
                        const isSelf = row.user_id === user.id;
                        let rankBadgeClass = "rank-badge rank-other";
                        if (row.rank === 1) rankBadgeClass = "rank-badge rank-1";
                        else if (row.rank === 2) rankBadgeClass = "rank-badge rank-2";
                        else if (row.rank === 3) rankBadgeClass = "rank-badge rank-3";

                        return (
                          <tr key={row.user_id} className={isSelf ? "leaderboard-row-current-user" : ""}>
                            <td>
                              <span className={rankBadgeClass}>
                                {row.rank}
                              </span>
                            </td>
                            <td>
                              <span className={isSelf ? "font-bold" : "font-medium"}>{row.name}</span>
                              {isSelf && <span className="you-badge">(You)</span>}
                            </td>
                            <td className="text-right bold-score-dark">
                              {row.correct_count} / {row.total_questions}
                            </td>
                            <td className="text-right bold-score-dark">
                              {formatTimePerCorrect(row.time_per_correct)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;