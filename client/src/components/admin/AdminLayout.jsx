import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/admin.css';

function AdminLayout({ children, title = "Admin Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get user details from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("admin-sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("admin-sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-close drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <div className="admin-mobile-header">
        <button
          className="admin-hamburger"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
        >
          <svg
            className="admin-hamburger-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {sidebarOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
        <h2>{title}</h2>
      </div>

      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-dot"></div>
          <span>AptiTest Admin</span>
        </div>

        <nav className="sidebar-menu">
          <Link
            to="/admin"
            className={`menu-item ${location.pathname === '/admin' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span>Dashboard</span>
          </Link>
          <Link
            to="/admin/manage-questions"
            className={`menu-item ${location.pathname === '/admin/manage-questions' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span>Manage Questions</span>
          </Link>
          <Link
            to="/admin/view-students"
            className={`menu-item ${location.pathname === '/admin/view-students' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span>View Students</span>
          </Link>
          <Link
            to="/admin/rankings"
            className={`menu-item ${location.pathname === '/admin/rankings' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
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
            <span>
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
