import {
  ClauseProcessingEngine,
  ProcessingResult,
  ProcessedClause,
  ClauseCategory,
  ClauseSentiment,
  RiskLevel,
} from "../types";

export class MockClauseEngine implements ClauseProcessingEngine {
  async processDocument(text: string): Promise<ProcessingResult> {
    const clauses = this.segmentAndClassify(text);
    return {
      clauses,
      summary: this.generateSummary(clauses),
      topRisks: this.extractTopRisks(clauses),
      obligations: this.extractObligations(clauses),
      exitConditions: this.extractExitConditions(clauses),
    };
  }

  private segmentAndClassify(text: string): ProcessedClause[] {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    return sentences.slice(0, 10).map((sentence, index) => {
      const category = this.classifyCategory(sentence);
      const sentiment = this.classifySentiment(sentence, category);
      const riskLevel = this.assessRisk(sentence, category);
      const explanation = this.generateExplanation(sentence, category, sentiment, riskLevel);

      return {
        text: sentence,
        category,
        sentiment,
        riskLevel,
        explanation,
      };
    });
  }

  private classifyCategory(text: string): ClauseCategory {
    const lower = text.toLowerCase();
    if (lower.includes("obligat") || lower.includes("shall") || lower.includes("must")) {
      return ClauseCategory.OBLIGATION;
    }
    if (lower.includes("right") || lower.includes("entitled") || lower.includes("may")) {
      return ClauseCategory.RIGHT;
    }
    if (lower.includes("penalt") || lower.includes("fine") || lower.includes("damages")) {
      return ClauseCategory.PENALTY;
    }
    if (lower.includes("terminat") || lower.includes("cancel") || lower.includes("end")) {
      return ClauseCategory.TERMINATION;
    }
    if (lower.includes("payment") || lower.includes("pay") || lower.includes("fee") || lower.includes("price")) {
      return ClauseCategory.PAYMENT_TERM;
    }
    return ClauseCategory.OTHER;
  }

  private classifySentiment(text: string, category: ClauseCategory): ClauseSentiment {
    const lower = text.toLowerCase();
    const favorableWords = ["benefit", "advantage", "protect", "favor", "reasonable", "fair"];
    const unfavorableWords = ["penalty", "liability", "breach", "default", "forfeit", "terminate"];

    const favorable = favorableWords.some((w) => lower.includes(w));
    const unfavorable = unfavorableWords.some((w) => lower.includes(w));

    if (favorable && !unfavorable) return ClauseSentiment.FAVORABLE;
    if (unfavorable && !favorable) return ClauseSentiment.UNFAVORABLE;
    return ClauseSentiment.NEUTRAL;
  }

  private assessRisk(text: string, category: ClauseCategory): RiskLevel {
    const lower = text.toLowerCase();
    const highRiskWords = ["immediate", "unlimited", "irrevocable", "absolute", "strict", "mandatory"];
    const mediumRiskWords = ["may", "reasonable", "standard", "typical", "customary"];

    if (highRiskWords.some((w) => lower.includes(w))) return RiskLevel.HIGH;
    if (mediumRiskWords.some((w) => lower.includes(w))) return RiskLevel.MEDIUM;
    if (category === ClauseCategory.PENALTY || category === ClauseCategory.TERMINATION) {
      return RiskLevel.HIGH;
    }
    return RiskLevel.LOW;
  }

  private generateExplanation(
    text: string,
    category: ClauseCategory,
    sentiment: ClauseSentiment,
    riskLevel: RiskLevel
  ): string {
    return `Classified as ${category} with ${sentiment.toLowerCase()} sentiment and ${riskLevel.toLowerCase()} risk. Based on keyword analysis of: "${text.substring(0, 50)}..."`;
  }

  private generateSummary(clauses: ProcessedClause[]): string {
    const counts = clauses.reduce(
      (acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const parts = Object.entries(counts).map(([cat, count]) => `${count} ${cat.toLowerCase()}(s)`);
    return `Document contains ${clauses.length} clauses: ${parts.join(", ")}. This is a mock summary generated for development purposes.`;
  }

  private extractTopRisks(clauses: ProcessedClause[]): string[] {
    return clauses
      .filter((c) => c.riskLevel === RiskLevel.HIGH)
      .slice(0, 5)
      .map((c) => c.text.substring(0, 100));
  }

  private extractObligations(clauses: ProcessedClause[]): string[] {
    return clauses
      .filter((c) => c.category === ClauseCategory.OBLIGATION)
      .slice(0, 10)
      .map((c) => c.text.substring(0, 100));
  }

  private extractExitConditions(clauses: ProcessedClause[]): string[] {
    return clauses
      .filter((c) => c.category === ClauseCategory.TERMINATION)
      .slice(0, 5)
      .map((c) => c.text.substring(0, 100));
  }
}

let engineInstance: ClauseProcessingEngine | null = null;

export function getClauseEngine(): ClauseProcessingEngine {
  if (!engineInstance) {
    engineInstance = new MockClauseEngine();
  }
  return engineInstance;
}

export function setClauseEngine(engine: ClauseProcessingEngine) {
  engineInstance = engine;
}