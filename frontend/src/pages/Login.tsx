import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { Alert } from "../components/Alert";
import { PageHead } from "../components/Layout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setError("");
    await login(email); // mock: the password is not sent anywhere
    navigate("/upload");
  }

  return (
    <>
      <PageHead title="Sign in" mock="Mock sign-in">Sign in to analyze contracts and review results.</PageHead>
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          <form onSubmit={onSubmit} noValidate>
            {/* TODO(backend): no auth endpoint exists yet. Replace with POST /api/auth/login when Abhishek's auth lands. */}
            <div className="field">
              <Alert kind="info">Sign-in is a placeholder for now. Any email and password will work.</Alert>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error && !email.includes("@")} aria-describedby={error ? "login-error" : undefined} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error && !password} aria-describedby={error ? "login-error" : undefined} />
            </div>
            {error && <div id="login-error" className="field"><Alert kind="error">{error}</Alert></div>}
            <button type="submit" className="btn">Sign in</button>
          </form>
        </div>
      </section>
    </>
  );
}
