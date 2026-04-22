import { z } from "zod";

// ── Shared enums ─────────────────────────────────────────────────────────────

const badgeVariantSchema = z.enum(["blue", "teal", "purple", "surface"]);
const colorVariantSchema = z.enum([
  "blue",
  "teal",
  "purple",
  "amber",
  "red",
  "gray",
]);
const statusVariantSchema = z.enum(["green", "amber", "coral"]);
const coverageStatusSchema = z.enum(["ok", "warn", "no", "info"]);
const urgencyVariantSchema = z.enum(["non-urgent", "moderate", "urgent"]);
const statVariantSchema = z.enum(["neutral", "teal", "amber"]);

// ── Profile Card ─────────────────────────────────────────────────────────────

const profileBadgeSchema = z.object({
  label: z
    .string()
    .describe(
      "Short badge label, e.g. 'GreenShield Flex', 'Non-urgent', 'EAP active'",
    ),
  variant: badgeVariantSchema.describe(
    "blue=insurance, teal=urgency/positive, purple=benefits, surface=neutral",
  ),
});

const profileFactSchema = z.object({
  emoji: z.string().describe("A single emoji representing this fact"),
  text: z
    .string()
    .describe("Concise fact text, e.g. 'Left knee pain · 3 weeks'"),
});

const profileColumnSchema = z.object({
  heading: z
    .string()
    .describe(
      "Column heading, e.g. 'What you described' or 'What you've tried'",
    ),
  facts: z.array(profileFactSchema).min(1).max(6),
});

const profileCardSchema = z.object({
  location: z.string().describe("Patient location, e.g. 'North York, ON'"),
  meta: z
    .string()
    .describe("Brief context line, e.g. 'Assessed today · Knee pain'"),
  badges: z.array(profileBadgeSchema).min(1).max(4),
  left: profileColumnSchema.describe(
    "Left column: symptoms and current situation",
  ),
  right: profileColumnSchema.describe(
    "Right column: what the patient has tried or relevant history",
  ),
});

// ── Urgency Bar ──────────────────────────────────────────────────────────────

const urgencyBarSchema = z.object({
  variant: urgencyVariantSchema,
  message: z
    .string()
    .describe(
      "Urgency explanation, e.g. 'Based on your symptoms, this is non-urgent — no ER visit needed. Physiotherapy is the right first step.'",
    ),
});

// ── Primary Recommendation ───────────────────────────────────────────────────

const actionRowSchema = z.object({
  emoji: z.string().describe("A single emoji for this action step"),
  colorVariant: colorVariantSchema.describe(
    "Background color theme for the icon",
  ),
  title: z
    .string()
    .describe(
      "Action step title, e.g. 'Book a physiotherapy assessment this week'",
    ),
  bullets: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe("Supporting details for this action"),
});

const primaryRecommendationSchema = z.object({
  title: z
    .string()
    .describe(
      "Main recommendation headline, e.g. 'Start with physiotherapy'",
    ),
  status: z.object({
    label: z
      .string()
      .describe(
        "Status label, e.g. 'Routine', 'Urgent', 'Follow-up needed'",
      ),
    variant: statusVariantSchema,
  }),
  intro: z
    .string()
    .describe("1-2 sentence explanation of the recommendation rationale"),
  actionRows: z.array(actionRowSchema).min(1).max(5),
});

// ── Key Insights ─────────────────────────────────────────────────────────────

const insightBarSchema = z.object({
  label: z
    .string()
    .describe("Bar label, e.g. 'Likelihood', 'Resolution rate'"),
  value: z
    .number()
    .min(0)
    .max(100)
    .describe("Percentage value for the bar"),
  colorVariant: colorVariantSchema,
});

const insightSchema = z.object({
  emoji: z.string(),
  colorVariant: colorVariantSchema,
  name: z
    .string()
    .describe(
      "Insight headline, e.g. 'Most likely: patellofemoral pain syndrome'",
    ),
  body: z.string().describe("1-2 sentence insight explanation"),
  bar: insightBarSchema.optional(),
});

// ── Coverage ─────────────────────────────────────────────────────────────────

const coverageRowSchema = z.object({
  status: coverageStatusSchema.describe(
    "ok=covered, warn=partial/conditional, no=not covered, info=informational",
  ),
  name: z.string().describe("Service name, e.g. 'Physiotherapy'"),
  detail: z
    .string()
    .describe("Plan/coverage detail, e.g. 'GreenShield Flex · $800/yr'"),
  value: z
    .string()
    .describe(
      "Cost or status, e.g. '$0 today', 'OHIP covered', '$75-$120/session'",
    ),
  valueVariant: coverageStatusSchema.describe(
    "Color variant for the value text",
  ),
});

const benefitActionSchema = z.object({
  emoji: z.string(),
  colorVariant: colorVariantSchema,
  title: z
    .string()
    .describe("Action title, e.g. 'Submit a physio claim'"),
  subtitle: z.string().describe("Brief description of the action"),
  eta: z
    .string()
    .describe(
      "Time estimate or call-to-action, e.g. '~2 min', 'Instant access', 'See options'",
    ),
});

const coveragePlanSchema = z.object({
  id: z
    .string()
    .describe(
      "Plan identifier slug, e.g. 'greenshield', 'ohip', 'uninsured'",
    ),
  label: z
    .string()
    .describe(
      "Display label, e.g. 'GreenShield Flex', 'OHIP only', 'No insurance'",
    ),
  rows: z.array(coverageRowSchema).min(1).max(8),
  actions: z.array(benefitActionSchema).max(4),
});

const coverageSchema = z.object({
  plans: z
    .array(coveragePlanSchema)
    .min(1)
    .max(4)
    .describe(
      "Coverage plans ordered from most relevant to fallback. Always include OHIP and uninsured as fallback options.",
    ),
});

// ── Care Resources ───────────────────────────────────────────────────────────

const careResourceSchema = z.object({
  emoji: z.string(),
  colorVariant: colorVariantSchema,
  title: z
    .string()
    .describe(
      "Resource title, e.g. 'Find in-network physiotherapists near you'",
    ),
  subtitle: z
    .string()
    .describe(
      "Brief description, e.g. '3 matched providers · North York · direct billing'",
    ),
});

// ── Care Summary (sidebar) ───────────────────────────────────────────────────

const careStatSchema = z.object({
  label: z.string(),
  value: z.string(),
  variant: statVariantSchema.describe(
    "neutral=default, teal=positive/good, amber=warning",
  ),
});

const careSummaryActionSchema = z.object({
  label: z
    .string()
    .describe("Action label, e.g. 'Providers near me'"),
  subtitle: z
    .string()
    .describe("Brief description, e.g. '3 in-network matches'"),
});

const careSummarySchema = z.object({
  title: z.string().describe("Card title, typically 'Care summary'"),
  subtitle: z
    .string()
    .describe("Brief context, e.g. 'Knee pain · Today'"),
  stats: z.array(careStatSchema).min(2).max(6),
  primaryAction: z.object({
    label: z
      .string()
      .describe("Primary CTA button label, e.g. 'Book physiotherapy →'"),
  }),
  actions: z.array(careSummaryActionSchema).max(4),
});

// ── Benefits Snapshot (sidebar) ──────────────────────────────────────────────

const benefitSnapshotItemSchema = z.object({
  label: z
    .string()
    .describe("Benefit category, e.g. 'Physiotherapy'"),
  value: z
    .string()
    .describe("Remaining balance or status, e.g. '$800 remaining', 'Active'"),
  variant: statVariantSchema,
});

const benefitsSnapshotSchema = z.object({
  planName: z
    .string()
    .describe("Insurance plan name, e.g. 'GreenShield Flex'"),
  items: z.array(benefitSnapshotItemSchema).min(1).max(6),
});

// ── Source Articles ──────────────────────────────────────────────────────────

const sourceArticleSchema = z.object({
  title: z.string(),
  url: z.string(),
});

// ── Full Payload ─────────────────────────────────────────────────────────────

export const recommendationPayloadSchema = z.object({
  profile: profileCardSchema,
  urgency: urgencyBarSchema,
  recommendation: primaryRecommendationSchema,
  insights: z.array(insightSchema).min(1).max(4),
  coverage: coverageSchema,
  careResources: z.array(careResourceSchema).min(1).max(5),
  careSummary: careSummarySchema,
  benefitsSnapshot: benefitsSnapshotSchema
    .optional()
    .describe("Include only when insurance/benefits details are known"),
  sourceArticles: z
    .array(sourceArticleSchema)
    .max(3)
    .optional()
    .describe("Top Health811 source articles used for this recommendation"),
});

// ── Inferred TypeScript types ────────────────────────────────────────────────

export type BadgeVariant = z.infer<typeof badgeVariantSchema>;
export type ColorVariant = z.infer<typeof colorVariantSchema>;
export type StatusVariant = z.infer<typeof statusVariantSchema>;
export type CoverageStatus = z.infer<typeof coverageStatusSchema>;
export type UrgencyVariant = z.infer<typeof urgencyVariantSchema>;
export type StatVariant = z.infer<typeof statVariantSchema>;

export type ProfileBadge = z.infer<typeof profileBadgeSchema>;
export type ProfileFact = z.infer<typeof profileFactSchema>;
export type ProfileColumn = z.infer<typeof profileColumnSchema>;
export type ProfileCard = z.infer<typeof profileCardSchema>;
export type UrgencyBar = z.infer<typeof urgencyBarSchema>;
export type ActionRow = z.infer<typeof actionRowSchema>;
export type PrimaryRecommendation = z.infer<typeof primaryRecommendationSchema>;
export type InsightBar = z.infer<typeof insightBarSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type CoverageRow = z.infer<typeof coverageRowSchema>;
export type BenefitAction = z.infer<typeof benefitActionSchema>;
export type CoveragePlan = z.infer<typeof coveragePlanSchema>;
export type Coverage = z.infer<typeof coverageSchema>;
export type CareResource = z.infer<typeof careResourceSchema>;
export type CareStat = z.infer<typeof careStatSchema>;
export type CareSummaryAction = z.infer<typeof careSummaryActionSchema>;
export type CareSummary = z.infer<typeof careSummarySchema>;
export type BenefitSnapshotItem = z.infer<typeof benefitSnapshotItemSchema>;
export type BenefitsSnapshot = z.infer<typeof benefitsSnapshotSchema>;
export type SourceArticle = z.infer<typeof sourceArticleSchema>;
export type RecommendationPayload = z.infer<typeof recommendationPayloadSchema>;
