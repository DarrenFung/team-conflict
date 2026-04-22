"use client";

import { useState } from "react";
import type { RecommendationPayload } from "@/types/recommendation";
import { AskLukeTopNav } from "@/components/layout/ask-luke-top-nav";
import { IntakeJourneyBar } from "@/components/intake/intake-journey-shell";
import { CoverageSection } from "./coverage-section";
import { badgeVariantClasses, coverageStatusIcon, coverageValueClasses } from "./variant-styles";

// ── Emergency banner ──────────────────────────────────────────────────────────

function EmergencyBanner() {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-4 rounded-[14px] border-2 border-[rgba(163,45,45,0.2)] bg-[#FCEBEB] px-[22px] py-[18px]">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#A32D2D]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-[#A32D2D]">
          This appears to be a medical emergency
        </p>
        <p className="mt-0.5 text-[13px] font-light leading-[1.5] text-[#6B7280]">
          Call 911 now. Do not drive yourself. Based on your symptoms, you need
          emergency medical attention immediately.
        </p>
      </div>
      <a
        href="tel:911"
        className="shrink-0 rounded-lg bg-[#A32D2D] px-6 py-[11px] text-[14px] font-semibold text-white transition-colors hover:bg-[#8a2020] max-sm:w-full max-sm:text-center"
      >
        Call 911 →
      </a>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function EmergencyHero({ subtitle }: { subtitle: string }) {
  return (
    <section className="pb-8 border-b border-[rgba(24,95,165,0.08)]">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[rgba(163,45,45,0.2)] bg-[#FCEBEB] px-3 py-1 text-[12px] font-semibold text-[#A32D2D]">
        <span className="size-[7px] shrink-0 animate-pulse rounded-full bg-[#A32D2D]" />
        Emergency · Urgent action required
      </div>
      <h1 className="font-[family-name:var(--font-dm-serif)] text-[clamp(28px,3.8vw,42px)] tracking-[-0.6px] leading-[1.05] text-[#0E1420]">
        Your emergency care pathway
      </h1>
      <p className="mt-2.5 max-w-[500px] text-sm font-light leading-[1.7] text-[#6B7280]">
        {subtitle}
      </p>
    </section>
  );
}

// ── Emergency profile card ────────────────────────────────────────────────────

function EmergencyProfileCard({
  profile,
}: {
  profile: RecommendationPayload["profile"];
}) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Your profile
      </p>
      <div className="rounded-2xl border border-[rgba(24,95,165,0.08)] bg-white p-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-[#0E1420]">
              {profile.location}
            </p>
            <p className="text-[13px] font-light text-[#6B7280]">
              {profile.meta}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.badges.map((b) => (
              <span
                key={b.label}
                className={`rounded-full px-2.5 py-[3px] text-[11px] font-medium ${badgeVariantClasses[b.variant]}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-5 h-px bg-[rgba(24,95,165,0.08)]" />

        {/* Two-column facts */}
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
          <div className="sm:border-r sm:border-[rgba(24,95,165,0.08)] sm:pr-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">
              {profile.left.heading}
            </p>
            <div className="flex flex-col gap-2">
              {profile.left.facts.map((f) => (
                <div
                  key={f.text}
                  className="flex items-start gap-[9px] text-[13px] font-light leading-[1.5] text-[#6B7280]"
                >
                  <span className="mt-px shrink-0 text-[13px]">{f.emoji}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-[rgba(24,95,165,0.08)] pt-4 sm:mt-0 sm:border-t-0 sm:pt-0 sm:pl-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">
              {profile.right.heading}
            </p>
            <div className="flex flex-col gap-2">
              {profile.right.facts.map((f) => (
                <div
                  key={f.text}
                  className="flex items-start gap-[9px] text-[13px] font-light leading-[1.5] text-[#6B7280]"
                >
                  <span className="mt-px shrink-0 text-[13px]">{f.emoji}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Red urgency bar ───────────────────────────────────────────────────────────

function EmergencyUrgencyBar({ message }: { message: string }) {
  return (
    <div className="pb-6 border-b border-[rgba(24,95,165,0.08)]">
      <div className="flex items-center gap-3 rounded-xl border border-[rgba(163,45,45,0.18)] bg-[#FCEBEB] px-[18px] py-3.5 text-[13.5px] leading-[1.55] text-[#A32D2D]">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-current" />
        <span className="flex-1">{message}</span>
      </div>
    </div>
  );
}

// ── Action steps ("What to do right now") ────────────────────────────────────

const stepColors = ["red", "red", "amber", "teal", "teal", "teal"] as const;
type StepColor = "red" | "amber" | "teal";

const stepColorClasses: Record<StepColor, string> = {
  red: "bg-[#FCEBEB] text-[#A32D2D]",
  amber: "bg-[#FFF6B6] text-[#7a5c00]",
  teal: "bg-[#E1F5EE] text-[#0F6E56]",
};

function ActionSteps({
  rows,
}: {
  rows: RecommendationPayload["recommendation"]["actionRows"];
}) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        What to do right now
      </p>
      <div className="flex flex-col">
        {rows.map((row, idx) => {
          const color = stepColors[idx] ?? "teal";
          return (
            <div
              key={row.title}
              className={`grid grid-cols-[40px_1fr] py-[18px] ${idx > 0 ? "border-t border-[rgba(24,95,165,0.08)]" : ""}`}
            >
              <div
                className={`mt-0.5 flex size-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${stepColorClasses[color]}`}
              >
                {idx + 1}
              </div>
              <div>
                <p className="mb-1.5 text-[14px] font-semibold text-[#0E1420]">
                  {row.title}
                </p>
                <div className="flex flex-col gap-1">
                  {row.bullets.map((b) => (
                    <p
                      key={b}
                      className="text-[13px] font-light leading-[1.6] text-[#6B7280]"
                    >
                      {b}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Red flags ─────────────────────────────────────────────────────────────────

function RedFlagsList({
  insights,
}: {
  insights: RecommendationPayload["insights"];
}) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Do not wait if you experience any of these
      </p>
      <div className="flex flex-col gap-[7px]">
        {insights.map((insight) => (
          <div
            key={insight.name}
            className="flex items-start gap-2.5 rounded-lg border border-[rgba(163,45,45,0.12)] bg-[#FCEBEB] px-3.5 py-2.5 text-[13px] leading-[1.5] text-[#1A2033]"
          >
            <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-[#A32D2D]" />
            <span>{insight.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Nearest ERs ───────────────────────────────────────────────────────────────

function NearestERList({
  resources,
}: {
  resources: RecommendationPayload["careResources"];
}) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Nearest emergency departments
      </p>
      <div className="flex flex-col gap-2">
        {resources.map((r) => (
          <div
            key={r.title}
            className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[rgba(24,95,165,0.08)] bg-white px-4 py-3.5 transition-shadow hover:shadow-[0_2px_12px_rgba(14,20,32,0.08)]"
          >
            <span className="shrink-0 text-[18px]">{r.emoji}</span>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#0E1420]">
                {r.title}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">{r.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Care advocacy ─────────────────────────────────────────────────────────────

function CareAdvocacy({
  summary,
}: {
  summary: RecommendationPayload["careSummary"];
}) {
  const rows = [
    {
      emoji: "🚨",
      bg: "bg-[#FCEBEB]",
      title: summary.primaryAction.label,
      sub: "Do not drive yourself — call 911 and stay on the line",
    },
    ...summary.actions.map((a) => ({
      emoji: "🏥",
      bg: "bg-[#E6F1FB]",
      title: a.label,
      sub: a.subtitle,
    })),
  ];

  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Care advocacy
      </p>
      <div className="flex flex-col">
        {rows.map((row, idx) => (
          <div
            key={row.title}
            className={`flex cursor-pointer items-center gap-3 py-3 transition-opacity hover:opacity-60 ${idx > 0 ? "border-t border-[rgba(24,95,165,0.08)]" : ""}`}
          >
            <div
              className={`flex size-[30px] shrink-0 items-center justify-center rounded-lg text-[13px] ${row.bg}`}
            >
              {row.emoji}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#0E1420]">
                {row.title}
              </p>
              <p className="mt-px text-[12px] text-[#6B7280]">{row.sub}</p>
            </div>
            <span className="text-[13px] text-[#9CA3AF]">→</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Emergency summary sidebar card ────────────────────────────────────────────

function EmergencySummarySidebar({
  summary,
}: {
  summary: RecommendationPayload["careSummary"];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[rgba(163,45,45,0.25)]">
      {/* Red header */}
      <div className="border-b border-[rgba(24,95,165,0.08)] bg-[#FCEBEB] px-[18px] py-3.5">
        <p className="text-[13px] font-semibold text-[#A32D2D]">
          🚨 Emergency summary
        </p>
        <p className="mt-0.5 text-xs text-[#6B7280]">{summary.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="bg-white px-[18px] py-3.5">
        {summary.stats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`flex items-center justify-between py-[7px] text-[13px] ${
              idx < summary.stats.length - 1
                ? "border-b border-[rgba(24,95,165,0.08)]"
                : ""
            }`}
          >
            <span className="text-[#6B7280]">{stat.label}</span>
            <span
              className={`font-medium ${
                stat.variant === "amber"
                  ? "text-[#7a5c00]"
                  : stat.variant === "teal"
                    ? "text-[#0F6E56]"
                    : "text-[#A32D2D]"
              }`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Call 911 CTA */}
      <div className="bg-white px-[18px] pb-1">
        <a
          href="tel:911"
          className="block w-full rounded-lg bg-[#A32D2D] py-3 text-center text-[14px] font-semibold text-white transition-colors hover:bg-[#8a2020]"
        >
          Call 911 now
        </a>
      </div>

      {/* Get directions action */}
      {summary.actions[0] && (
        <div className="flex cursor-pointer items-center justify-between border-t border-[rgba(24,95,165,0.08)] bg-white px-[18px] py-3 transition-colors hover:bg-[#F7F9FC]">
          <div>
            <p className="text-[13px] font-medium text-[#0E1420]">
              {summary.actions[0].label}
            </p>
            <p className="text-[11.5px] text-[#6B7280]">
              {summary.actions[0].subtitle}
            </p>
          </div>
          <span className="text-xs text-[#9CA3AF]">→</span>
        </div>
      )}

      {/* Disclaimer */}
      <div className="border-t border-[rgba(24,95,165,0.08)] bg-white px-[18px] py-3 text-[11px] leading-[1.65] text-[#6B7280]">
        <strong className="font-medium text-[#1A2033]">Call 911 now.</strong>{" "}
        Do not drive yourself to hospital.
      </div>
    </div>
  );
}

// ── Coverage at a glance sidebar card ─────────────────────────────────────────

function CoverageGlanceSidebar({
  coverage,
}: {
  coverage: RecommendationPayload["coverage"];
}) {
  const firstPlan = coverage.plans[0];
  if (!firstPlan) return null;

  return (
    <div className="overflow-hidden rounded-[14px] border border-[rgba(24,95,165,0.08)] bg-white">
      <div className="border-b border-[rgba(24,95,165,0.08)] px-[18px] py-3.5">
        <p className="text-[13px] font-semibold text-[#0E1420]">
          Coverage at a glance
        </p>
        <p className="mt-0.5 text-xs text-[#6B7280]">{firstPlan.label}</p>
      </div>
      <div className="px-[18px] py-3.5">
        {firstPlan.rows.map((row, idx) => {
          const icon = coverageStatusIcon[row.status];
          return (
            <div
              key={row.name}
              className={`flex items-center justify-between py-[7px] text-[13px] ${
                idx < firstPlan.rows.length - 1
                  ? "border-b border-[rgba(24,95,165,0.08)]"
                  : ""
              }`}
            >
              <span className="text-[#6B7280]">{row.name}</span>
              <span className={`font-medium whitespace-nowrap ${coverageValueClasses[row.valueVariant]}`}>
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-[rgba(24,95,165,0.08)] px-[18px] py-3 text-[11px] leading-[1.65] text-[#6B7280]">
        <strong className="font-medium text-[#1A2033]">
          No prior authorisation required
        </strong>{" "}
        for emergency services under Ontario law.
      </div>
    </div>
  );
}

// ── Medical disclaimer ────────────────────────────────────────────────────────

function EmergencyDisclaimer() {
  return (
    <div className="pt-5 text-[11px] leading-[1.7] text-[#6B7280]">
      <strong className="font-medium text-[#1A2033]">Medical disclaimer:</strong>{" "}
      AskLuke provides health system navigation guidance only — not medical
      advice or diagnosis. If you are experiencing a medical emergency, call 911
      immediately. Do not delay emergency care.
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export function EmergencyRecommendationPage({
  data,
}: {
  data: RecommendationPayload;
}) {
  return (
    <div className="min-h-svh bg-[#F7F9FC]">
      <AskLukeTopNav />
      <div className="fixed inset-x-0 top-[10px] z-50 border-b border-[rgba(24,95,165,0.12)] bg-white/95 pt-2 backdrop-blur-[10px]">
        <IntakeJourneyBar active="recommendation" />
      </div>

      <div className="mx-auto max-w-[1040px] px-8 pt-[116px] pb-[100px] max-md:px-5 max-md:pb-[60px]">
        <div className="lg:grid lg:grid-cols-[1fr_292px]">
          {/* ── Main column ─────────────────────────────────────────────── */}
          <div className="min-w-0 lg:pr-[52px]">
            <EmergencyBanner />

            <EmergencyHero
              subtitle={
                data.recommendation.intro ||
                "AskLuke has detected symptoms that require immediate emergency care. Here's what to do right now, what to expect, and how your coverage applies."
              }
            />

            <EmergencyProfileCard profile={data.profile} />

            <EmergencyUrgencyBar message={data.urgency.message} />

            <ActionSteps rows={data.recommendation.actionRows} />

            <RedFlagsList insights={data.insights} />

            <NearestERList resources={data.careResources} />

            <CareAdvocacy summary={data.careSummary} />

            <CoverageSection coverage={data.coverage} />

            <EmergencyDisclaimer />
          </div>

          {/* ── Sidebar — desktop ───────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[116px] space-y-3">
              <EmergencySummarySidebar summary={data.careSummary} />
              <CoverageGlanceSidebar coverage={data.coverage} />
            </div>
          </aside>

          {/* ── Sidebar — mobile ────────────────────────────────────────── */}
          <div className="mt-5 space-y-3 lg:hidden">
            <EmergencySummarySidebar summary={data.careSummary} />
            <CoverageGlanceSidebar coverage={data.coverage} />
          </div>
        </div>
      </div>
    </div>
  );
}
