import { useState } from "react";
import { login } from "../services/auth.service";
import { useNavigate, Link } from "react-router-dom";
import "../styles/auth.css"

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResendLink, setShowResendLink] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowResendLink(false);

    try {
        const data = await login(email, password);

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "admin") {
            navigate("/admin");
        } else if (data.user.role === "student") {
            navigate("/dashboard");
        }
    } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.message || "Login failed. Please check your credentials.";
        setError(errorMsg);
        
        // Show resend link for unverified email
        if (errorMsg.toLowerCase().includes("verify your email")) {
          setShowResendLink(true);
        }
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
            <h1>AptiTest</h1>
            <p>Sign in to continue</p>

            {error && (
              <div className="error-message" style={{ marginBottom: '16px' }}>
                {error}
                {showResendLink && (
                  <div style={{ marginTop: '8px' }}>
                    <Link to="/resend-verification" style={{ color: '#818cf8', textDecoration: 'underline', fontSize: '13px' }}>
                      Resend verification email →
                    </Link>
                  </div>
                )}
              </div>
            )}

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
            />

            <div className="forgot-password-link">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>

            <p>
              Don't have an account?
              <Link to="/signup"> Sign up</Link>
            </p>
        </form>
    </div>
  );
}

export default Login;