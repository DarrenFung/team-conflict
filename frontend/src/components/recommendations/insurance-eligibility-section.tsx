"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  InsuranceEligibility,
  InsurancePlanKey,
  CoverageIndicator,
} from "@/types/recommendation";

const PLAN_LABELS: Record<InsurancePlanKey, string> = {
  medicare: "Medicare",
  medicaid: "Medicaid",
  private: "Private / employer",
  uninsured: "Uninsured",
};

const indicatorStyles: Record<CoverageIndicator, { cls: string; char: string }> = {
  ok: { cls: "bg-[#E1F5EE] text-[#0F6E56]", char: "✓" },
  warn: { cls: "bg-[#FEF3E2] text-[#7a4f0d]", char: "~" },
  no: { cls: "bg-[#FDF0EE] text-[#a33228]", char: "✕" },
  info: { cls: "bg-[#E6F1FB] text-[#185FA5]", char: "i" },
};

const badgeStyles = {
  teal: "bg-[#E1F5EE] text-[#0F6E56]",
  amber: "bg-[#FEF3E2] text-[#7a4f0d]",
  blue: "bg-[#E6F1FB] text-[#185FA5]",
};

interface Props {
  insurance: InsuranceEligibility;
}

export function InsuranceEligibilitySection({ insurance }: Props) {
  const [activePlan, setActivePlan] = useState<InsurancePlanKey>("medicare");
  const planData = insurance.plans[activePlan];

  return (
    <section className="border-b border-border py-8">
      <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
        Insurance eligibility
      </p>

      {/* Plan pill selector */}
      <div className="mb-[22px] flex flex-wrap gap-2">
        {(Object.keys(PLAN_LABELS) as InsurancePlanKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActivePlan(key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all",
              activePlan === key
                ? "border-foreground bg-foreground text-white"
                : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
            )}
          >
            {PLAN_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="mb-[22px] grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border sm:grid-cols-3">
        {[
          { label: "Covered services", value: String(planData.covered) },
          { label: "Require prior auth", value: String(planData.auth) },
          { label: "Est. monthly cost", value: planData.cost },
        ].map((m) => (
          <div key={m.label} className="bg-white px-[18px] py-4">
            <p className="mb-[5px] text-[11.5px] text-muted-foreground">{m.label}</p>
            <p className="font-[family-name:var(--font-dm-serif)] text-2xl leading-none tracking-tight text-foreground">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Coverage cards */}
      <div className="mb-[22px] grid grid-cols-1 gap-3 sm:grid-cols-3">
        {planData.cards.map((card) => (
          <div key={card.title} className="overflow-hidden rounded-[10px] border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[13px] font-semibold text-foreground">{card.title}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  badgeStyles[card.badgeVariant],
                )}
              >
                {card.badgeLabel}
              </span>
            </div>
            {card.items.map((item, i) => {
              const ind = indicatorStyles[item.status];
              return (
                <div
                  key={i}
                  className="grid grid-cols-[18px_1fr] gap-2.5 border-b border-border px-4 py-2.5 last:border-b-0"
                >
                  <div
                    className={cn(
                      "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold",
                      ind.cls,
                    )}
                  >
                    {ind.char}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <p className="mt-px text-[11.5px] leading-[1.5] text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Take action rows */}
      {insurance.takeActionRows.map((row, i) => (
        <div
          key={row.id}
          className={cn(
            "flex cursor-pointer items-center gap-[13px] py-[13px] transition-opacity hover:opacity-65",
            i > 0 && "border-t border-border",
            i === 0 && "pt-0",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[13px]",
              row.bgClass,
            )}
          >
            {row.emoji}
          </div>
          <div>
            <p className="text-[13.5px] font-medium text-foreground">{row.title}</p>
            <p className="text-[12px] text-muted-foreground">{row.subtitle}</p>
          </div>
          <span className="ml-auto text-[13px] text-muted-foreground/40">→</span>
        </div>
      ))}
    </section>
  );
}
