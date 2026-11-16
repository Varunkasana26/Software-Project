import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getServerMode } from "../api/client";
import { Alert } from "../components/Alert";
import { useAuth } from "../components/Auth";
import { PageHead } from "../components/Layout";
import PlayfulButton from "../components/PlayfulButton";
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
  const [filled,setFilled]=useState(""); const [signinSuccess,setSigninSuccess]=useState(false); const fillTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const typing=useRef(0); const signInField=useRef<HTMLInputElement>(null); const signUpField=useRef<HTMLInputElement>(null);
  useEffect(()=>{(mode==="signin"?signInField:signUpField).current?.focus()},[mode]);
  function fill(a:typeof DEMO_ACCOUNTS[number]){const run=++typing.current;setMode("signin");setFilled(a.role);setEmail("");setPassword("");if(fillTimer.current)clearTimeout(fillTimer.current);if(matchMedia("(prefers-reduced-motion: reduce)").matches){setEmail(a.email);setPassword(a.password)}else{let i=0;const emailTimer=setInterval(()=>{if(typing.current!==run){clearInterval(emailTimer);return}i++;setEmail(a.email.slice(0,i));if(i>=a.email.length){clearInterval(emailTimer);let j=0;const passTimer=setInterval(()=>{if(typing.current!==run){clearInterval(passTimer);return}j++;setPassword(a.password.slice(0,j));if(j>=a.password.length)clearInterval(passTimer)},12)}},25)}fillTimer.current=setTimeout(()=>setFilled(""),1200)}
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
      if(mode==="signin"){setSigninSuccess(true);setTimeout(()=>navigate(from,{replace:true}),500)}else navigate(from,{replace:true});
    } catch (err) {
      setSigninSuccess(false);setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="login-wrap"><div className={`login-box ${mode} ${filled?"fill-highlight":""}`}><form className={`login-form signin-form${error?" has-error":""}`} onSubmit={onSubmit} noValidate inert={mode!=="signin"}><h1>Sign in</h1><p className="muted">Return to your documents and reviews.</p><label>Email<input ref={signInField} type="email" autoComplete="email" value={email} onChange={e=>{typing.current++;setEmail(e.target.value)}}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>{typing.current++;setPassword(e.target.value)}}/></label>{error&&mode==="signin"&&<p className="field-error" role="alert">{error}</p>}<PlayfulButton className="btn" type="submit" busy={busy} success={signinSuccess} disabled={busy} aria-label={busy?"Signing in":signinSuccess?"Signed in":"Sign in"} icon={<svg className="key-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3m-6 0 3 3"/></svg>}>{busy?"Signing in":signinSuccess?"Signed in":"Sign in"}</PlayfulButton><button type="button" className="link-btn" onClick={()=>{setError("");setMode("signup")}}>Create an account</button></form><form className={`login-form signup-form${error?" has-error":""}`} onSubmit={onSubmit} noValidate inert={mode!=="signup"}><h1>Create account</h1><p className="muted">Start reviewing a contract in minutes.</p><label>Email<input ref={signUpField} type="email" autoComplete="email" value={email} onChange={e=>{typing.current++;setEmail(e.target.value)}}/></label><label>Password<input type="password" autoComplete="new-password" value={password} onChange={e=>{typing.current++;setPassword(e.target.value)}}/></label><small>At least 8 characters.</small>{error&&mode==="signup"&&<p className="field-error" role="alert">{error}</p>}<button className="btn create-account" disabled={busy}>{busy?"Please wait…":"Create account"}</button><button type="button" className="link-btn" onClick={()=>{setError("");setMode("signin")}}>Sign in</button></form><div className="cover"><div><h2>{mode==="signin"?"Welcome back.":"Start the first page."}</h2><p>Legal documents, made clearer.</p></div></div></div>{offline&&<div className="demo-hint"><strong>Offline demo mode.</strong> Data is cleared when the server stops. {DEMO_ACCOUNTS.map(a=><PlayfulButton key={a.role} type="button" outline ripple success={filled===a.role} className="btn btn--secondary btn--small" onClick={()=>fill(a)} icon={a.role==="User"?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></svg>:a.role==="Lawyer"?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v17M5 6h14M5 6 2 13h6L5 6Zm14 0-3 7h6l-3-7ZM6 21h12"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5-3 9-8 11-5-2-8-6-8-11V5zM8 12l3 3 5-6"/></svg>}>Fill in {a.role}</PlayfulButton>)}</div>}</section>;
}
