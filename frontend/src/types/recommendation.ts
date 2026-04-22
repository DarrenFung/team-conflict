// ── Journey bar ──────────────────────────────────────────────────────────────

export type JourneyStepState = "done" | "active" | "upcoming";

export interface JourneyStep {
  id: string;
  label: string;
  state: JourneyStepState;
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export interface RecommendationHero {
  eyebrow: string;
  title: string;
  subtitle: string;
}

// ── Profile & Situation ───────────────────────────────────────────────────────

export interface ProfileFact {
  iconKey: "user" | "calendar" | "pill" | "drop" | "heart";
  text: string;
}

export interface ProfileColumn {
  heading: string;
  facts: ProfileFact[];
}

export interface ProfileSituation {
  left: ProfileColumn;
  right: ProfileColumn;
}

// ── Primary Recommendation ────────────────────────────────────────────────────

export type StatusVariant = "green" | "amber" | "coral";

export interface ActionBullet {
  text: string;
}

export interface ActionRow {
  emoji: string;
  bgClass: string;
  title: string;
  bullets: ActionBullet[];
}

export interface PrimaryRecommendation {
  title: string;
  status: { label: string; variant: StatusVariant };
  intro: string;
  actionRows: ActionRow[];
}

// ── Insights ──────────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  emoji: string;
  bgClass: string;
  name: string;
  body: string;
  bar?: { label: string; value: number; colorClass: string };
}

// ── Care Advocacy ─────────────────────────────────────────────────────────────

export interface AdvocacyItem {
  id: string;
  emoji: string;
  bgClass: string;
  title: string;
  subtitle: string;
  href?: string;
}

// ── Insurance Eligibility ─────────────────────────────────────────────────────

export type InsurancePlanKey = "medicare" | "medicaid" | "private" | "uninsured";

export type CoverageIndicator = "ok" | "warn" | "no" | "info";

export interface CoverageItem {
  status: CoverageIndicator;
  title: string;
  detail: string;
}

export interface CoverageCard {
  title: string;
  badgeLabel: string;
  badgeVariant: "teal" | "amber" | "blue";
  items: CoverageItem[];
}

export interface InsurancePlanData {
  covered: number;
  auth: number;
  cost: string;
  cards: CoverageCard[];
}

export interface TakeActionItem {
  id: string;
  emoji: string;
  bgClass: string;
  title: string;
  subtitle: string;
  href?: string;
}

export interface InsuranceEligibility {
  plans: Record<InsurancePlanKey, InsurancePlanData>;
  takeActionRows: TakeActionItem[];
}

// ── Care Summary (sidebar) ────────────────────────────────────────────────────

export type StatVariant = "neutral" | "warn" | "positive";

export interface CareStat {
  label: string;
  value: string;
  variant: StatVariant;
}

export interface CareSummaryAction {
  id: string;
  label: string;
  subtitle: string;
  href?: string;
}

export interface CareSummary {
  title: string;
  subtitle: string;
  stats: CareStat[];
  actions: CareSummaryAction[];
}

// ── Full payload ──────────────────────────────────────────────────────────────

export interface RecommendationPayload {
  journeySteps: JourneyStep[];
  hero: RecommendationHero;
  profileSituation: ProfileSituation;
  primaryRecommendation: PrimaryRecommendation;
  insights: Insight[];
  advocacy: AdvocacyItem[];
  insurance: InsuranceEligibility;
  careSummary: CareSummary;
}
