import { useState } from "react";
import { signup } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css"

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
        const data = await signup(name, email, password);
        console.log(data);

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "admin") {
            navigate("/admin");
        } else {
            navigate("/dashboard");
        }
    } catch (err) {
        console.error(err);
    }



  };

  return (
    <div className="signup-page">
        <form className="signup-card" onSubmit={handleSignup}>
            <h1>AptiTest</h1>
            <p>Sign up to continue</p>

            <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            />

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

            <button type="submit">Sign Up</button>
        </form>
    </div>
  );
}

export default Signup;