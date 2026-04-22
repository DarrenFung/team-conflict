"use client";

import {
  MessageSquare,
  Calendar,
  Zap,
  Pill,
  CreditCard,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientReview } from "@/app/api/intake/patient-review/route";

// ── Section config ─────────────────────────────────────────────────────────────

const SECTION_CONFIG = {
  concern: {
    label: "Your concern",
    Icon: MessageSquare,
    iconSrc: null,
  },
  duration: {
    label: "How long",
    Icon: Calendar,
    iconSrc: null,
  },
  severity: {
    label: "Severity",
    Icon: Zap,
    iconSrc: null,
  },
  treatment: {
    label: "Treatment so far",
    Icon: Pill,
    iconSrc: null,
  },
  coverage: {
    label: "Coverage",
    Icon: CreditCard,
    iconSrc: null,
  },
} as const;

const SECTION_ORDER: (keyof typeof SECTION_CONFIG)[] = [
  "concern",
  "duration",
  "severity",
  "treatment",
  "coverage",
];

// ── Tag pill ───────────────────────────────────────────────────────────────────

function TagPill({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[rgba(24,95,165,0.18)] bg-[#F0F6FF] px-3 py-1.5 text-[12px] font-medium text-[#1a5fa5]">
      {icon}
      {label}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 border-b border-[rgba(24,95,165,0.08)] px-5 py-4 last:border-b-0">
      <div className="mt-0.5 size-8 shrink-0 animate-pulse rounded-lg bg-[#E8F0FB]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[#E8F0FB]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#E8F0FB]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#E8F0FB]" />
      </div>
    </div>
  );
}

export function IntakeReviewSummarySkeleton() {
  return (
    <div className="animate-in fade-in-0 duration-200 space-y-6">
      {/* Eyebrow + title */}
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-[#E8F0FB]" />
        <div className="h-9 w-56 animate-pulse rounded bg-[#E8F0FB]" />
      </div>
      {/* Banner */}
      <div className="h-14 animate-pulse rounded-xl bg-[#E8F0FB]" />
      {/* Card */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(24,95,165,0.12)] bg-white shadow-sm">
        {SECTION_ORDER.map((id) => (
          <SkeletonRow key={id} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function IntakeReviewSummary({ review }: { review: PatientReview }) {
  const sectionMap = Object.fromEntries(
    review.sections.map((s) => [s.id, s.body]),
  );

  const { location, planType, urgency, benefitStatus } = review.tags;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300 space-y-6">
      {/* Eyebrow */}
      <p className="text-[13px] font-medium text-primary">
        Here&apos;s what we heard
      </p>

      {/* Title */}
      <h1 className="font-[family-name:var(--font-dm-serif)] text-[clamp(28px,5vw,40px)] leading-[1.2] tracking-[-0.5px] text-[#0E1420]">
        Does this look right?
      </h1>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[rgba(24,95,165,0.15)] bg-[#E6F1FB] px-4 py-3.5">
        <span
          aria-hidden
          className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-dm-serif)] text-[11px] text-white"
        >
          L
        </span>
        <p className="text-[13px] leading-[1.55] text-[#0e4a87]">
          Based on everything you&apos;ve shared, here&apos;s a summary of your
          situation. Review it and make any changes before we personalize your
          pathway.
        </p>
      </div>

      {/* Sections card */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(24,95,165,0.12)] bg-white shadow-sm">
        {SECTION_ORDER.map((id, i) => {
          const { label, Icon } = SECTION_CONFIG[id];
          const body = sectionMap[id];
          return (
            <div
              key={id}
              className={cn(
                "flex items-start gap-4 px-5 py-4",
                i < SECTION_ORDER.length - 1 &&
                  "border-b border-[rgba(24,95,165,0.08)]",
              )}
            >
              {/* Icon */}
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF]">
                <Icon className="size-[15px] text-primary" strokeWidth={1.6} />
              </div>
              {/* Text */}
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </p>
                <p className="text-[15px] leading-[1.55] text-foreground">
                  {body ?? "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tag pills */}
      {(location || planType || urgency || benefitStatus) && (
        <div className="flex flex-wrap gap-2">
          {location && (
            <TagPill
              icon={<MapPin className="size-[11px]" />}
              label={location}
            />
          )}
          {planType && <TagPill label={planType} />}
          {urgency && <TagPill label={urgency} />}
          {benefitStatus && <TagPill label={benefitStatus} />}
        </div>
      )}
    </div>
  );
}
