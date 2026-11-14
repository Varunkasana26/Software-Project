import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getServerMode } from "../api/client";
import { Alert } from "../components/Alert";
import { useAuth } from "../components/Auth";
import { PageHead } from "../components/Layout";

// Public local-demo accounts. They only exist when the backend runs in offline demo mode (see README.md).
const DEMO_ACCOUNTS = [
  { role: "User", email: "demo.user@example.com", password: "DemoUser-2026!" },
  { role: "Lawyer", email: "demo.lawyer@example.com", password: "DemoLawyer-2026!" },
  { role: "Admin", email: "demo.admin@example.com", password: "DemoAdmin-2026!" },
];

export default function Login() {
  const [offline, setOffline] = useState(false);
  useEffect(() => { getServerMode().then((m) => setOffline(m === "offline-demo")); }, []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/upload";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (mode === "signup" && password.length < 8) return setError("Choose a password of at least 8 characters.");
    if (!password) return setError("Enter your password.");
    setError("");
    setBusy(true);
    try {
      await (mode === "signin" ? signIn : signUp)(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={mode === "signin" ? "Sign in" : "Create an account"}>Sign in to analyze contracts and review results.</PageHead>
      <section className="section">
        <div className="container" style={{ maxWidth: 480 }}>
          {offline && (
            <div className="field">
              <Alert kind="info">
                <strong>Offline demo mode.</strong> The server runs without a database, so data is lost when it stops. Use a demo account:
                <div className="row" style={{ marginTop: 8 }}>
                  {DEMO_ACCOUNTS.map((a) => (
                    <button key={a.role} type="button" className="btn btn--secondary btn--small" onClick={() => { setEmail(a.email); setPassword(a.password); setMode("signin"); setError(""); }}>
                      Fill in {a.role}
                    </button>
                  ))}
                </div>
              </Alert>
            </div>
          )}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error && !email.includes("@")} aria-describedby={error ? "login-error" : undefined} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password}
                onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error && !password} aria-describedby={error ? "login-error" : "password-help"} />
              {mode === "signup" && <p id="password-help" className="help">At least 8 characters.</p>}
            </div>
            {error && <div id="login-error" className="field"><Alert kind="error">{error}</Alert></div>}
            <div className="row">
              <button type="submit" className="btn" disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}</button>
              <button type="button" className="link-btn" onClick={() => { setError(""); setMode(mode === "signin" ? "signup" : "signin"); }}>
                {mode === "signin" ? "Create an account" : "I already have an account"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
