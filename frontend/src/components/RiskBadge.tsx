import type { ClauseView, Label } from "../api/client";
import { HighIcon, LowIcon, MediumIcon, NeutralIcon } from "./Icons";

export type Tier = "high" | "medium" | "low" | "neutral";

// Score is 0-10. See "Score to tier" in frontend/DESIGN.md.
export function tierFromScore(score: number): Tier {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  if (score > 0) return "low";
  return "neutral";
}

// Effective score: a lawyer override wins when present; the auto score is never replaced.
export function effectiveScore(c: Pick<ClauseView, "autoScore" | "override">): number {
  return c.override ? c.override.score : c.autoScore;
}

export function clauseTier(c: ClauseView): Tier {
  return tierFromScore(effectiveScore(c));
}

const TEXT: Record<Tier, string> = { high: "High risk", medium: "Medium risk", low: "Low risk", neutral: "Neutral" };
const ICON = { high: HighIcon, medium: MediumIcon, low: LowIcon, neutral: NeutralIcon };

// Always icon + word + number, so risk never depends on colour.
export function RiskBadge({ tier, score, label }: { tier: Tier; score: number | null; label?: Label }) {
  const Icon = ICON[tier];
  const text = TEXT[tier];
  return (
    <span className={`badge badge--${tier}`}>
      <Icon />
      {text}
      {score !== null && <span className="mono">{score}</span>}
    </span>
  );
}
