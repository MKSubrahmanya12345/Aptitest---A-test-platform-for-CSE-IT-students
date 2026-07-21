import { useState } from "react";
import { login } from "../services/auth.service";
import { useNavigate, Link } from "react-router-dom";
import "../styles/login.css"

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
        const data = await login(email, password);

        console.log(data);
    } catch (err) {
        console.error(err);
    }

    const data = await login(email, password);

    console.log(data);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.role === "admin") {
    navigate("/admin");
    } else if (data.user.role === "student") {
    navigate("/dashboard");
    }


  };

  return (
    <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
            <h1>AptiTest</h1>
            <p>Sign in to continue</p>

            <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />

            <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            />

            <button type="submit">Login</button>

            <p>
              Don't have an account?
              <Link to="/signup"> Sign up</Link>
            </p>
        </form>
    </div>
  );
}

export default Login;