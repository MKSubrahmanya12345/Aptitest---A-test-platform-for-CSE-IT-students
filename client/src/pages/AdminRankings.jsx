// ??$$$
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { testApiService } from '../services/test.service';
import StudentStatsModal from '../components/admin/StudentStatsModal';
import '../styles/admin.css';
import '../styles/student.css'; // import student styles for leaderboard table & badges

function AdminRankings() {
  const [leaderboardList, setLeaderboardList] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState("easy_30"); // 'easy_30' | 'easy_60' | 'hard_30' | 'hard_60'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  async function fetchLeaderboard() {
    setLoading(true);
    setError("");
    try {
      const data = await testApiService.getLeaderboard(leaderboardType);
      setLeaderboardList(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load leaderboard rankings.");
    } finally {
      setLoading(false);
    }
  }

  // ??$$$
  // Helper to format average time taken per correct question
  function formatTimePerCorrect(seconds) {
    if (!seconds || seconds <= 0 || seconds >= 999999) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s/q`;
    }
    return `${secs}s/q`;
  }

  /* old code
  return (
    <AdminLayout title="Global Student Rankings">
      {error && <div style={{ color: 'var(--error-color)', marginBottom: '20px' }}>{error}</div>}

      <div className="summary-card" style={{ padding: '24px', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-main)' }}>
          Leaderboard Categories
        </h3>

        <div className="ranking-toggle-container" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setLeaderboardType("easy_30")}
            className={`ranking-toggle-btn ${leaderboardType === "easy_30" ? "active" : ""}`}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: leaderboardType === 'easy_30' ? 'var(--primary-color)' : '#ffffff',
              color: leaderboardType === 'easy_30' ? '#ffffff' : 'var(--text-main)',
              transition: 'all 0.2s'
            }}
          >
            Easy - 30 Qs
          </button>
          <button
            onClick={() => setLeaderboardType("easy_60")}
            className={`ranking-toggle-btn ${leaderboardType === "easy_60" ? "active" : ""}`}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: leaderboardType === 'easy_60' ? 'var(--primary-color)' : '#ffffff',
              color: leaderboardType === 'easy_60' ? '#ffffff' : 'var(--text-main)',
              transition: 'all 0.2s'
            }}
          >
            Easy - 60 Qs
          </button>
          <button
            onClick={() => setLeaderboardType("hard_30")}
            className={`ranking-toggle-btn ${leaderboardType === "hard_30" ? "active" : ""}`}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: leaderboardType === 'hard_30' ? 'var(--primary-color)' : '#ffffff',
              color: leaderboardType === 'hard_30' ? '#ffffff' : 'var(--text-main)',
              transition: 'all 0.2s'
            }}
          >
            Hard - 30 Qs
          </button>
          <button
            onClick={() => setLeaderboardType("hard_60")}
            className={`ranking-toggle-btn ${leaderboardType === "hard_60" ? "active" : ""}`}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: leaderboardType === 'hard_60' ? 'var(--primary-color)' : '#ffffff',
              color: leaderboardType === 'hard_60' ? '#ffffff' : 'var(--text-main)',
              transition: 'all 0.2s'
            }}
          >
            Hard - 60 Qs
          </button>
        </div>

        {loading ? (
          <div className="loader-container" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="loader"></div>
          </div>
        ) : (
          <div className="leaderboard-container">
            {leaderboardList.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No ranked participants for this test template yet.
              </div>
            ) : (
              // ??$$$
              <table className="leaderboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ width: "80px", padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Rank</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Student Name</th>
                    <th style={{ textAlign: "right", padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Correct Answers</th>
                    <th style={{ textAlign: "right", padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>Avg Time / Correct</th>
                    <th style={{ textAlign: "right", padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)', width: '150px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardList.map((row) => {
                    let rankBadgeClass = "rank-badge rank-other";
                    if (row.rank === 1) rankBadgeClass = "rank-badge rank-1";
                    else if (row.rank === 2) rankBadgeClass = "rank-badge rank-2";
                    else if (row.rank === 3) rankBadgeClass = "rank-badge rank-3";

                    return (
                      <tr 
                        key={row.user_id} 
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                        onClick={() => setSelectedStudent({ id: row.user_id, name: row.name })}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <span className={rankBadgeClass}>
                            {row.rank}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: "600", color: 'var(--primary-color)' }}>
                            {row.name}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#1e293b", padding: '12px 16px' }}>
                          {row.correct_count} / {row.total_questions}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#1e293b", padding: '12px 16px' }}>
                          {formatTimePerCorrect(row.time_per_correct)}
                        </td>
                        <td style={{ textAlign: "right", padding: '12px 16px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent({ id: row.user_id, name: row.name });
                            }}
                            className="btn btn-approve"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            View Stats
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentStatsModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </AdminLayout>
  );
  */

  // ??$$$
  return (
    <AdminLayout title="Global Student Rankings">
      {error && <div className="error-message">{error}</div>}

      <div className="summary-card rankings-card">
        <h3 className="section-subtitle">
          Leaderboard Categories
        </h3>

        {/* 4 Ranking toggles */}
        <div className="rankings-toggle-container">
          <button
            onClick={() => setLeaderboardType("easy_30")}
            className={`rankings-toggle-btn ${leaderboardType === "easy_30" ? "active" : ""}`}
          >
            Easy - 30 Qs
          </button>
          <button
            onClick={() => setLeaderboardType("easy_60")}
            className={`rankings-toggle-btn ${leaderboardType === "easy_60" ? "active" : ""}`}
          >
            Easy - 60 Qs
          </button>
          <button
            onClick={() => setLeaderboardType("hard_30")}
            className={`rankings-toggle-btn ${leaderboardType === "hard_30" ? "active" : ""}`}
          >
            Hard - 30 Qs
          </button>
          <button
            onClick={() => setLeaderboardType("hard_60")}
            className={`rankings-toggle-btn ${leaderboardType === "hard_60" ? "active" : ""}`}
          >
            Hard - 60 Qs
          </button>
        </div>

        {loading ? (
          <div className="loader-container loader-centered">
            <div className="loader"></div>
          </div>
        ) : (
          <div className="leaderboard-container">
            {leaderboardList.length === 0 ? (
              <div className="loader-centered cell-muted">
                No ranked participants for this test template yet.
              </div>
            ) : (
              <table className="leaderboard-table table-full-width">
                <thead>
                  <tr className="table-header-row">
                    <th className="table-cell-padding bold-header col-rank">Rank</th>
                    <th className="table-cell-padding bold-header">Student Name</th>
                    <th className="table-cell-padding bold-header text-right">Correct Answers</th>
                    <th className="table-cell-padding bold-header text-right">Avg Time / Correct</th>
                    <th className="table-cell-padding bold-header text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardList.map((row) => {
                    let rankBadgeClass = "rank-badge rank-other";
                    if (row.rank === 1) rankBadgeClass = "rank-badge rank-1";
                    else if (row.rank === 2) rankBadgeClass = "rank-badge rank-2";
                    else if (row.rank === 3) rankBadgeClass = "rank-badge rank-3";

                    return (
                      <tr 
                        key={row.user_id} 
                        className="table-body-row cursor-pointer"
                        onClick={() => setSelectedStudent({ id: row.user_id, name: row.name })}
                      >
                        <td className="table-cell-padding">
                          <span className={rankBadgeClass}>
                            {row.rank}
                          </span>
                        </td>
                        <td className="table-cell-padding">
                          <span className="cell-main-bold color-primary">
                            {row.name}
                          </span>
                        </td>
                        <td className="table-cell-padding text-right bold-score">
                          {row.correct_count} / {row.total_questions}
                        </td>
                        <td className="table-cell-padding text-right bold-score">
                          {formatTimePerCorrect(row.time_per_correct)}
                        </td>
                        <td className="table-cell-padding text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent({ id: row.user_id, name: row.name });
                            }}
                            className="btn btn-approve btn-small"
                          >
                            View Stats
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentStatsModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </AdminLayout>
  );
}

export default AdminRankings;
