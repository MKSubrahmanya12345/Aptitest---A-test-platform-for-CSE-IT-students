import { useState } from "react";
import { Link } from "react-router-dom";
import { signup } from "../services/auth.service";
import "../styles/auth.css"

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
        const data = await signup(name, email, password);
        setSuccess(true);
    } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="signup-page">
        <div className="signup-card auth-success" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="success-icon" style={{ margin: '0 auto 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2>Account Created! 🎉</h2>
          <p>Please check your email <strong>{email}</strong> to verify your account.</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '16px' }}>
            You need to verify your email before you can log in.
          </p>
          <div style={{ marginTop: '24px' }}>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
        <form className="signup-card" onSubmit={handleSignup}>
            <h1>AptiTest</h1>
            <p>Sign up to continue</p>

            {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

            <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            />

            <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            />

            <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p>
              Already have an account?
              <Link to="/login"> Sign in</Link>
            </p>
        </form>
    </div>
  );
}

export default Signup;