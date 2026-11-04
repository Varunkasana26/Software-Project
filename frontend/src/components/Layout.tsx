import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { currentUser, logout } from "../api/client";

// Development-only marker for pages backed by mock data. Not rendered in production builds.
export function MockTag({ what = "Mock data" }: { what?: string }) {
  return import.meta.env.DEV ? <span className="tag tag--mock">{what}</span> : null;
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
  const [user, setUser] = useState(currentUser());
  // login() and logout() in api/client.ts fire "auth-change".
  useEffect(() => {
    const sync = () => setUser(currentUser());
    window.addEventListener("auth-change", sync);
    return () => window.removeEventListener("auth-change", sync);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="band app-header">
        <div className="container">
          <Link to="/" className="brand">Legal Document Summarizer</Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/upload">Upload</NavLink>
            <NavLink to="/report/demo">Demo report</NavLink>
            <NavLink to="/review/demo">Lawyer review</NavLink>
            <NavLink to="/admin/rules">Rules</NavLink>
            {user ? (
              <button type="button" onClick={() => { logout(); navigate("/login"); }}>
                Sign out
              </button>
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
