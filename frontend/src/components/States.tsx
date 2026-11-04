import type { ReactNode } from "react";
import { Alert } from "./Alert";
import { DocIcon } from "./Icons";

// Fixed-height blocks so content does not jump when it arrives.
export function Loading({ label = "Loading", blocks = 3, height = 96 }: { label?: string; blocks?: number; height?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="visually-hidden">{label}...</span>
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="skeleton" style={{ height, marginBottom: 12 }} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="stack">
      <Alert kind="error">
        <strong>Something went wrong.</strong> {message}
      </Alert>
      {onRetry && <button type="button" className="btn btn--secondary" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <DocIcon />
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}
