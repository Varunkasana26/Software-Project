import type { ReactNode } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { DEMO_MODE } from "../api/client";
import { useRef, useState } from "react";
import { useSpringIndicator } from "../hooks/useMotion";
import { DissolveText } from "./DissolveText";
import { useAuth } from "./Auth";

// Development-only marker for pages showing demo data (VITE_DEMO_MODE=true). Never rendered in production builds.
export function MockTag({ what = "Demo data" }: { what?: string }) {
  return DEMO_MODE ? <span className="tag tag--mock">{what}</span> : null;
}

export function PageHead({ title, children, mock }: { title: string; children?: ReactNode; mock?: string }) {
  return (
    <div className="band page-head">
      <div className="container">
        <h1>{title} {mock && <MockTag what={mock} />}</h1>
        {children && <p className="lead muted">{children}</p>}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate(); const location = useLocation(); const { user, signOut } = useAuth();
  const [theme,setTheme]=useState(document.documentElement.dataset.theme ?? "dark"); const [themeFlip,setThemeFlip]=useState(false);
  const active=useRef<HTMLElement|null>(null); const indicator=useSpringIndicator(active, `${user?.role}-${location.pathname}`);
  function toggleTheme(){const next=theme==="dark"?"light":"dark";setTheme(next);setThemeFlip(true);setTimeout(()=>setThemeFlip(false),400);document.documentElement.dataset.theme=next;try{localStorage.setItem("theme",next)}catch{}}
  return <><svg width="0" height="0" style={{position:"absolute"}} aria-hidden="true"><filter id="lg" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G"/></filter></svg><a className="skip-link" href="#main">Skip to content</a><header className="app-header"><div className="container nav-shell"><Link to="/" className="brand" aria-label="Legal Document Summarizer"><DissolveText>Legal Document Summarizer</DissolveText></Link><nav className="pill nav" aria-label="Main">{user&&<><span ref={indicator} className="nav-indicator"/>{[["/upload","Analyze",true],["/documents","Documents",true],["/review","Review",user.role==="LAWYER"],["/admin/rules","Rules",user.role==="ADMIN"]].filter(x=>x[2]).map(([path,label])=><NavLink key={label as string} to={path as string} aria-label={label as string} end={path==="/upload"} ref={el=>{if(el?.getAttribute("aria-current")==="page")active.current=el}}><DissolveText>{label as string}</DissolveText></NavLink>)}{location.pathname.startsWith("/report/")&&<NavLink to={location.pathname} aria-label="Report" ref={el=>{if(el?.getAttribute("aria-current")==="page")active.current=el}}><DissolveText>Report</DissolveText></NavLink>}<span className="nav-user">{user.email} · {user.role.toLowerCase()}</span><button type="button" aria-label="Sign out" onClick={async()=>{await signOut();navigate("/login")}}><DissolveText>Sign out</DissolveText></button></>}{!user&&<NavLink to="/login">Sign in</NavLink>}<button type="button" aria-label="Toggle light or dark theme" onClick={toggleTheme}><span className={`theme-icon${themeFlip?" swap":""}`} aria-hidden="true">{theme==="dark"?"☼":"◐"}</span></button></nav></div></header><main id="main" tabIndex={-1}>{children}</main></>;
}
