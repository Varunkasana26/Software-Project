import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getServerMode } from "../api/client";
import { Alert } from "../components/Alert";
import { useAuth } from "../components/Auth";
import { PageHead } from "../components/Layout";
import StretchButton from "../components/StretchButton";
import RippleButton from "../components/RippleButton";
import { DissolveText } from "../components/DissolveText";
import { useRef } from "react";

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
  const [filled,setFilled]=useState(""); const fillTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function fill(a:typeof DEMO_ACCOUNTS[number]){setEmail(a.email);setPassword(a.password);setMode("signin");setFilled(a.role);if(fillTimer.current)clearTimeout(fillTimer.current);fillTimer.current=setTimeout(()=>setFilled(""),1200)}
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

  return <section className="login-wrap"><div className={`login-box ${mode} ${filled?"fill-highlight":""}`}><form className="login-form signin-form" onSubmit={onSubmit} noValidate><h1>Sign in</h1><p className="muted">Return to your documents and reviews.</p><label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&mode==="signin"&&<p className="field-error" role="alert">{error}</p>}<StretchButton className="btn" type="submit" disabled={busy}>{busy?"Please wait…":"Sign in"}</StretchButton><button type="button" className="link-btn" onClick={()=>{setError("");setMode("signup")}}>Create an account</button></form><form className="login-form signup-form" onSubmit={onSubmit} noValidate><h1>Create account</h1><p className="muted">Start reviewing a contract in minutes.</p><label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><small>At least 8 characters.</small>{error&&mode==="signup"&&<p className="field-error" role="alert">{error}</p>}<button className="btn create-account" disabled={busy}><DissolveText disabled={busy}>{busy?"Please wait…":"Create account"}</DissolveText></button><button type="button" className="link-btn" onClick={()=>{setError("");setMode("signin")}}>Sign in</button></form><div className="cover"><div><h2>{mode==="signin"?"Welcome back.":"Start the first page."}</h2><p>Legal documents, made clearer.</p></div></div></div>{offline&&<div className="demo-hint"><strong>Offline demo mode.</strong> Data is cleared when the server stops. {DEMO_ACCOUNTS.map(a=><RippleButton key={a.role} type="button" className="btn btn--secondary btn--small" onClick={()=>fill(a)}>{filled===a.role?"✓ ":""}Fill in {a.role}</RippleButton>)}</div>}</section>;
}
