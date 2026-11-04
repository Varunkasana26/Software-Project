import type { ReactNode } from "react";
import { CheckIcon, ErrorIcon, InfoIcon, MediumIcon } from "./Icons";

type Kind = "error" | "warning" | "info" | "success";
const ICON = { error: ErrorIcon, warning: MediumIcon, info: InfoIcon, success: CheckIcon };

// Errors and warnings are announced immediately (role="alert"); info and success politely (role="status").
export function Alert({ kind, children }: { kind: Kind; children: ReactNode }) {
  const Icon = ICON[kind];
  return (
    <div className={`alert alert--${kind}`} role={kind === "error" || kind === "warning" ? "alert" : "status"}>
      <Icon />
      <div>{children}</div>
    </div>
  );
}
