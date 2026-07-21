import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/admin.css';

function AdminLayout({ children, title = "Admin Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user details from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-dot"></div>
          <span>AptiTest Admin</span>
        </div>
        
        <nav className="sidebar-menu">
          <Link 
            to="/admin" 
            className={`menu-item ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/admin/manage-questions" 
            className={`menu-item ${location.pathname === '/admin/manage-questions' ? 'active' : ''}`}
          >
            <span>📝</span>
            <span>Manage Questions</span>
          </Link>
          <Link 
            to="/admin/view-students" 
            className={`menu-item ${location.pathname === '/admin/view-students' ? 'active' : ''}`}
          >
            <span>📝</span>
            <span>View Students</span>
          </Link>
          {/* ??$$$ */}
          <Link 
            to="/admin/rankings" 
            className={`menu-item ${location.pathname === '/admin/rankings' ? 'active' : ''}`}
          >
            <span>🏆</span>
            <span>Rankings</span>
          </Link>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-title">
            <h1>{title}</h1>
          </div>
          <div className="header-user">
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>
              Welcome, {user.name || 'Admin'}
            </span>
            <div className="user-avatar">
              {(user.name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
