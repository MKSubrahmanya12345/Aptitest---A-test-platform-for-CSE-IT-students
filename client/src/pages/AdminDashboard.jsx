import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { reviewService } from '../services/review.service';
import '../styles/admin.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await reviewService.getStats();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dashboard statistics.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard">
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      </AdminLayout>
    );
  }

  /* old code
  const last30DaysData = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    // Format to local YYYY-MM-DD to match database output format
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const trendItem = stats?.dailyTrends?.find(item => item.date === dateStr);
    last30DaysData.push({
      date: dateStr,
      displayDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: trendItem ? trendItem.count : 0
    });
  }
  */
  // ??$$$
  const last30DaysData = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const trendItem = stats?.dailyTrends?.find(item => item.date === dateStr);
    last30DaysData.push({
      date: dateStr,
      displayDate: d.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' }),
      count: trendItem ? trendItem.count : 0
    });
  }

  const maxCount = Math.max(...last30DaysData.map(d => d.count), 1);

  return (
    <AdminLayout title="Admin Dashboard">
      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}
      
      {/* Stats Summary */}
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Pending Review</h4>
          <div className="value">{stats?.pendingCount || 0}</div>
          <button 
            onClick={() => navigate('/admin/manage-questions')} 
            className="btn btn-approve"
            style={{ marginTop: '10px', fontSize: '12px', padding: '6px 12px' }}
          >
            Review Questions →
          </button>
        </div>
        
        <div className="summary-card">
          <h4>Live Approved Questions</h4>
          <div className="value">{stats?.approvedCount || 0}</div>
          <button 
            onClick={() => navigate('/admin/manage-questions?tab=approved')} 
            className="btn btn-edit"
            style={{ marginTop: '10px', fontSize: '12px', padding: '6px 12px' }}
          >
            View Live Bank
          </button>
        </div>
        



        <div className="summary-card">
          <h4>Active Categories</h4>
          <div className="value">{stats?.categories?.length || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '14px' }}>
            Across all topics
          </div>
        </div>

        <div className="summary-card">
          <h4>Registered Students</h4>
          <div className="value">{stats?.studentCount || 0}</div>
          <button 
            onClick={() => navigate('/admin/view-students')} 
            className="btn btn-edit"
            style={{ marginTop: '10px', fontSize: '12px', padding: '6px 12px' }}
          >
            View Students →
          </button>
        </div>
      </div>

      {/* ??$$$ */}
      {/* Test Attempt Ingestion & Daily Trends (C for admin) */}
      <div style={{ marginTop: '40px', backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-family-display)' }}>
          📈 Test Completion Trends
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          Daily completed student test attempts over the last 30 days
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Chart container */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid #cbd5e1' }}>
            {last30DaysData.map((d, index) => {
              const heightPercent = (d.count / maxCount) * 100;
              return (
                <div 
                  key={index} 
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                >
                  <div 
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: '700', 
                      color: 'var(--primary-color)',
                      marginBottom: '4px',
                      opacity: d.count > 0 ? 1 : 0,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {d.count}
                  </div>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: `${heightPercent}%`, 
                      minHeight: d.count > 0 ? '4px' : '1px',
                      background: d.count > 0 ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)' : '#e2e8f0',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      cursor: 'pointer'
                    }}
                    title={`${d.date}: ${d.count} completed tests`}
                  />
                </div>
              );
            })}
          </div>
          
          {/* X-axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', padding: '0 4px', fontWeight: '500' }}>
            <span>{last30DaysData[0]?.displayDate}</span>
            <span>{last30DaysData[15]?.displayDate}</span>
            <span>{last30DaysData[29]?.displayDate}</span>
          </div>
        </div>
      </div>

      {/* Category Wise Distribution */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
          Approved Questions by Category
        </h2>
        {stats?.categories?.length === 0 ? (
          <div className="empty-state">
            <h3>No Live Questions Yet</h3>
            <p>Approve pending questions to see them listed by category here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {stats?.categories?.map((cat, idx) => (
              <div 
                key={idx} 
                className="summary-card" 
                style={{ borderLeft: '4px solid var(--primary-color)' }}
              >
                <h4 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: '600' }}>
                  {cat.category}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Approved Questions:</span>
                  <span style={{ fontWeight: '700', fontSize: '16px' }}>{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;