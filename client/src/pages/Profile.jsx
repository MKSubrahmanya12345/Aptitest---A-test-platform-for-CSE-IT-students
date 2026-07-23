import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testApiService } from '../services/test.service';
import '../styles/student.css';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    setFormData({
      name: storedUser.name || '',
      email: storedUser.email || ''
    });
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const history = await testApiService.getHistory();
      
      let totalTests = history.length;
      let avgScore = 0;
      let highScore = 0;
      let totalTime = 0;
      let totalCorrect = 0;
      let totalQuestions = 0;

      history.forEach(test => {
        if (test.score_obtained !== undefined) {
          avgScore += test.score_obtained;
          highScore = Math.max(highScore, test.score_obtained);
        }
        if (test.time_taken) totalTime += test.time_taken;
        if (test.correct_count !== undefined) totalCorrect += test.correct_count;
        if (test.total_questions !== undefined) totalQuestions += test.total_questions;
      });

      avgScore = totalTests > 0 ? Math.round(avgScore / totalTests) : 0;
      const avgTime = totalTests > 0 ? Math.round(totalTime / totalTests) : 0;
      const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

      setStats({
        totalTests,
        avgScore,
        highScore,
        avgTime,
        overallAccuracy,
        totalCorrect,
        totalQuestions
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    setMessage('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!formData.name || !formData.email) {
      setMessage('Name and email are required');
      return;
    }

    setSaving(true);
    try {
      // For now, just update localStorage (in production, call API)
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditMode(false);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      setMessage('All password fields are required');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      setMessage('New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      // Call API to change password
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      });

      if (response.ok) {
        setMessage('Password changed successfully');
        setPasswordData({ current: '', new: '', confirm: '' });
        setShowPasswordForm(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await response.json();
        setMessage(err.message || 'Failed to change password');
      }
    } catch (err) {
      setMessage('Error changing password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('student-sidebar-open');
    } else {
      document.body.classList.remove('student-sidebar-open');
    }
    return () => document.body.classList.remove('student-sidebar-open');
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className="student-dashboard-container">
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard-container">
      {/* Sidebar */}
      <aside className="student-sidebar">
        <div className="sidebar-header">
          <span style={{ fontSize: '22px' }}>⚡</span>
          <span>AptiTest</span>
        </div>

        <nav className="sidebar-menu">
          <a href="/dashboard" className="menu-item">📊 Dashboard</a>
          <a href="/profile" className="menu-item active">👤 Profile</a>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="student-main">
        {/* Header */}
        <header className="student-header">
          <div className="header-left">
            <button 
              className="hamburger-menu" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h1>Profile</h1>
          </div>
        </header>

        {/* Content */}
        <div className="student-content">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Message */}
            {message && (
              <div style={{
                padding: '14px 16px',
                backgroundColor: message.includes('successfully') ? '#ecfdf5' : '#fee2e2',
                color: message.includes('successfully') ? '#065f46' : '#991b1b',
                borderRadius: '10px',
                marginBottom: '24px',
                fontWeight: '500',
                fontSize: '14px'
              }}>
                {message}
              </div>
            )}

            {/* Profile Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                  Account Details
                </h2>
                <button 
                  onClick={handleEditToggle}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: editMode ? '#ef4444' : '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  {editMode ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', gap: '16px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '36px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)'
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                    {user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {user?.email || 'email@example.com'}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              {editMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      Full Name
                    </label>
                    <input 
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      Email Address
                    </label>
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#6366f1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={handleEditToggle}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#e2e8f0',
                        color: '#111827',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Full Name
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
                      {formData.name || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Email Address
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
                      {formData.email || 'Not set'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
                Performance Overview
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#6366f1' }}>
                    {stats?.totalTests || 0}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: '500' }}>
                    Tests Taken
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed' }}>
                    {stats?.avgScore || 0}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: '500' }}>
                    Average Score
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                    {stats?.highScore || 0}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: '500' }}>
                    Highest Score
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
                    {stats?.overallAccuracy || 0}%
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: '500' }}>
                    Overall Accuracy
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#111827' }}>
                Security & Password
              </h3>

              {!showPasswordForm ? (
                <button 
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Change Password
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      Current Password
                    </label>
                    <input 
                      type="password"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      New Password
                    </label>
                    <input 
                      type="password"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                      Confirm New Password
                    </label>
                    <input 
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={handlePasswordChange}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#6366f1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                    <button 
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({ current: '', new: '', confirm: '' });
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#e2e8f0',
                        color: '#111827',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
