import { useEffect, useState, useRef, type FormEvent } from "react";
import type React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getServerMode } from "../api/client";
import { Alert } from "../components/Alert";
import { useAuth } from "../components/Auth";
import { PageHead } from "../components/Layout";
import PlayfulButton from "../components/PlayfulButton";
import { DissolveText } from "../components/DissolveText";

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
  const [revealed, setRevealed] = useState<"signin" | "signup">("signin");
  const [sliding, setSliding] = useState(false);
  const [hasSwitched, setHasSwitched] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionCleanup = useRef<(() => void) | null>(null);
  const pendingMode = useRef<"signin" | "signup">("signin");
  const hasMounted = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const [filled,setFilled]=useState(""); const [signinSuccess,setSigninSuccess]=useState(false); const fillTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const typing=useRef(0); const signInField=useRef<HTMLInputElement>(null); const signUpField=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!hasMounted.current){hasMounted.current=true;return}(revealed==="signin"?signInField:signUpField).current?.focus({preventScroll:true})},[revealed]);
  useEffect(()=>()=>{if(transitionTimer.current)clearTimeout(transitionTimer.current);transitionCleanup.current?.()},[]);
  function finishTransition(){if(transitionTimer.current)clearTimeout(transitionTimer.current);transitionTimer.current=null;transitionCleanup.current?.();transitionCleanup.current=null;setRevealed(pendingMode.current);setSliding(false)}
  function switchMode(next:"signin"|"signup"){if(next===mode&&!sliding)return;setHasSwitched(true);transitionCleanup.current?.();if(transitionTimer.current)clearTimeout(transitionTimer.current);pendingMode.current=next;if(matchMedia("(prefers-reduced-motion: reduce)").matches){setMode(next);setRevealed(next);setSliding(false);return}setSliding(true);setMode(next);const cover=coverRef.current;if(cover){const onEnd=(event:Event)=>{const e=event as TransitionEvent;if(e.target===cover&&e.propertyName==="transform")finishTransition()};cover.addEventListener("transitionend",onEnd);transitionCleanup.current=()=>cover.removeEventListener("transitionend",onEnd)}transitionTimer.current=setTimeout(finishTransition,850)}
  function fill(a:typeof DEMO_ACCOUNTS[number]){const run=++typing.current;if(!sliding)switchMode("signin");setFilled(a.role);setEmail("");setPassword("");if(fillTimer.current)clearTimeout(fillTimer.current);if(matchMedia("(prefers-reduced-motion: reduce)").matches){setEmail(a.email);setPassword(a.password)}else{let i=0;const emailTimer=setInterval(()=>{if(typing.current!==run){clearInterval(emailTimer);return}i++;setEmail(a.email.slice(0,i));if(i>=a.email.length){clearInterval(emailTimer);let j=0;const passTimer=setInterval(()=>{if(typing.current!==run){clearInterval(passTimer);return}j++;setPassword(a.password.slice(0,j));if(j>=a.password.length)clearInterval(passTimer)},12)}},25)}fillTimer.current=setTimeout(()=>setFilled(""),1200)}
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

  return <section className="login-wrap"><div className={`login-box ${mode} ${hasSwitched?"has-switched":""} ${filled?"fill-highlight":""} ${sliding?"is-sliding":""}`}>
    <form className={`login-form signin-form ${revealed==="signin"&&!sliding?"is-revealed":""}${error?" has-error":""}`} onSubmit={onSubmit} noValidate inert={revealed!=="signin"||sliding} aria-hidden={revealed!=="signin"||sliding}>
      <h1 className="stagger-item" style={{"--i":0} as React.CSSProperties}>Sign in</h1><p className="muted stagger-item" style={{"--i":1} as React.CSSProperties}>Return to your documents and reviews.</p>
      <label className="stagger-item" style={{"--i":2} as React.CSSProperties}>Email<input ref={signInField} type="email" autoComplete="email" value={email} onChange={e=>{typing.current++;setEmail(e.target.value)}}/></label>
      <label className="stagger-item" style={{"--i":3} as React.CSSProperties}>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>{typing.current++;setPassword(e.target.value)}}/></label>
      {error&&mode==="signin"&&<p className="field-error stagger-item" role="alert" style={{"--i":4} as React.CSSProperties}>{error}</p>}
      <div className="stagger-item" style={{"--i":5} as React.CSSProperties}><PlayfulButton className="btn" type="submit" busy={busy} success={signinSuccess} disabled={busy} aria-label={busy?"Signing in":signinSuccess?"Signed in":"Sign in"} icon={<svg className="key-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3m-6 0 3 3"/></svg>}>{busy?"Signing in":signinSuccess?"Signed in":"Sign in"}</PlayfulButton></div>
      <button type="button" className="link-btn stagger-item" style={{"--i":6} as React.CSSProperties} onClick={()=>{setError("");switchMode("signup")}}>Create an account</button>
    </form>
    <form className={`login-form signup-form ${revealed==="signup"&&!sliding?"is-revealed":""}${error?" has-error":""}`} onSubmit={onSubmit} noValidate inert={revealed!=="signup"||sliding} aria-hidden={revealed!=="signup"||sliding}>
      <h1 className="stagger-item" style={{"--i":0} as React.CSSProperties}>Create account</h1><p className="muted stagger-item" style={{"--i":1} as React.CSSProperties}>Start reviewing a contract in minutes.</p>
      <label className="stagger-item" style={{"--i":2} as React.CSSProperties}>Email<input ref={signUpField} type="email" autoComplete="email" value={email} onChange={e=>{typing.current++;setEmail(e.target.value)}}/></label>
      <label className="stagger-item" style={{"--i":3} as React.CSSProperties}>Password<input type="password" autoComplete="new-password" value={password} onChange={e=>{typing.current++;setPassword(e.target.value)}}/></label>
      <small className="stagger-item" style={{"--i":4} as React.CSSProperties}>At least 8 characters.</small>
      {error&&mode==="signup"&&<p className="field-error stagger-item" role="alert" style={{"--i":4} as React.CSSProperties}>{error}</p>}
      <button className="btn create-account stagger-item" style={{"--i":5} as React.CSSProperties} disabled={busy}>{busy?"Please wait…":"Create account"}</button>
      <button type="button" className="link-btn stagger-item" style={{"--i":6} as React.CSSProperties} onClick={()=>{setError("");switchMode("signin")}}>I already have an account</button>
    </form>
    <div ref={coverRef} className="cover"><div><h2>{mode==="signin"?"Welcome back.":"Start the first page."}</h2><p>Legal documents, made clearer.</p></div></div></div>{offline&&<div className="demo-hint"><strong>Offline demo mode.</strong> Data is cleared when the server stops. {DEMO_ACCOUNTS.map(a=><PlayfulButton key={a.role} type="button" outline ripple success={filled===a.role} className="btn btn--secondary btn--small" onClick={()=>fill(a)} icon={a.role==="User"?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></svg>:a.role==="Lawyer"?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v17M5 6h14M5 6 2 13h6L5 6Zm14 0-3 7h6l-3-7ZM6 21h12"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5-3 9-8 11-5-2-8-6-8-11V5zM8 12l3 3 5-6"/></svg>}>Fill in {a.role}</PlayfulButton>)}</div>}</section>;
}
