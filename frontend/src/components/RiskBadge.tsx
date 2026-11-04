import type { ClauseView, Label } from "../api/client";
import { HighIcon, LowIcon, MediumIcon, NeutralIcon } from "./Icons";

export type Tier = "high" | "medium" | "low" | "neutral";

// Score is 0-10. See "Score to tier" in frontend/DESIGN.md.
export function tierFromScore(score: number): Tier {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  if (score > 0) return "low";
  return "neutral";
}

// Effective score: a lawyer override wins when present; the auto score is never replaced.
export function effectiveScore(c: Pick<ClauseView, "autoScore" | "override">): number | null {
  return c.override ? c.override.score : c.autoScore;
}

export function clauseTier(c: ClauseView): Tier {
  if (c.label === "FAVORABLE" && !c.override) return "low";
  const score = effectiveScore(c);
  if (score !== null) return tierFromScore(score);
  // TODO(backend): only riskLevel is available for real clauses until a numeric score is returned.
  if (c.riskLevel === "HIGH") return "high";
  if (c.riskLevel === "MEDIUM") return "medium";
  return c.label === "UNFAVORABLE" ? "low" : "neutral";
}

const TEXT: Record<Tier, string> = { high: "High risk", medium: "Medium risk", low: "Low risk", neutral: "Neutral" };
const ICON = { high: HighIcon, medium: MediumIcon, low: LowIcon, neutral: NeutralIcon };

// Always icon + word + number, so risk never depends on colour.
export function RiskBadge({ tier, score, label }: { tier: Tier; score: number | null; label?: Label }) {
  const Icon = ICON[tier];
  const text = tier === "low" && label === "FAVORABLE" ? "Favorable" : TEXT[tier];
  return (
    <span className={`badge badge--${tier}`}>
      <Icon />
      {text}
      {score !== null && <span className="mono">{score}</span>}
    </span>
  );
}
