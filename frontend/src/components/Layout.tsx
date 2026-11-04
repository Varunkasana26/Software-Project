import type { ReactNode } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { DEMO_MODE } from "../api/client";
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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="band app-header">
        <div className="container">
          <Link to="/" className="brand">Legal Document Summarizer</Link>
          <nav className="nav" aria-label="Main">
            {user && <NavLink to="/upload">Analyze</NavLink>}
            {user && <NavLink to="/documents">Documents</NavLink>}
            {user && <NavLink to="/admin/rules">Rules</NavLink>}
            {DEMO_MODE && <NavLink to="/report/demo">Demo report</NavLink>}
            {user ? (
              <>
                <span className="muted small" style={{ alignSelf: "center", padding: "0 8px" }}>{user.email} ({user.role.toLowerCase()})</span>
                <button type="button" onClick={async () => { await signOut(); navigate("/login"); }}>Sign out</button>
              </>
            ) : (
              <NavLink to="/login">Sign in</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  );
}
