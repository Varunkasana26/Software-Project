import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import * as api from "../api/client";
import { Alert } from "./Alert";
import { PageHead } from "./Layout";
import { Loading } from "./States";

interface AuthState {
  user: api.User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
    const expired = () => setUser(null); // the API answered 401
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => setUser((await api.login(email, password)).user), []);
  const signUp = useCallback(async (email: string, password: string) => setUser((await api.register(email, password)).user), []);
  const signOut = useCallback(async () => { await api.logout().catch(() => undefined); setUser(null); }, []);
  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Sends signed-out visitors to the sign-in page, and shows a clear message to users without the right role. */
export function Guard({ roles, children }: { roles?: api.Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="container section"><Loading label="Checking your session" blocks={1} /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <>
        <PageHead title="Not allowed" />
        <section className="section"><div className="container"><Alert kind="warning">Your account ({user.role.toLowerCase()}) cannot open this page.</Alert></div></section>
      </>
    );
  }
  return <>{children}</>;
}
