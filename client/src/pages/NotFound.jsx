import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/notfound.css";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-desc">
          The page you're looking for doesn't exist or has been moved. Head
          back to the dashboard or sign in again.
        </p>
        <div className="notfound-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="notfound-btn secondary"
          >
            Go Back
          </button>
          <Link to="/login" className="notfound-btn">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;