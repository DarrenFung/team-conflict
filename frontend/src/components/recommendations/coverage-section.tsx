"use client";

import { useState } from "react";
import type { Coverage } from "@/types/recommendation";
import { coverageStatusIcon, coverageValueClasses, colorVariantClasses } from "./variant-styles";

export function CoverageSection({ coverage }: { coverage: Coverage }) {
  const [activePlanId, setActivePlanId] = useState(coverage.plans[0].id);
  const activePlan = coverage.plans.find((p) => p.id === activePlanId) ?? coverage.plans[0];

  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Your coverage
      </p>

      {/* Plan pills */}
      <div className="mb-[18px] flex flex-wrap gap-1.5">
        {coverage.plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setActivePlanId(plan.id)}
            className={`rounded-full border-[1.5px] px-4 py-1.5 text-[13px] font-medium transition-all ${
              plan.id === activePlanId
                ? "border-[#0E1420] bg-[#0E1420] text-white"
                : "border-[rgba(24,95,165,0.08)] text-[#6B7280] hover:border-[#1A2033] hover:text-[#1A2033]"
            }`}
          >
            {plan.label}
          </button>
        ))}
      </div>

      {/* Coverage rows */}
      <div className="mb-5 overflow-hidden rounded-xl border border-[rgba(24,95,165,0.08)]">
        {activePlan.rows.map((row, idx) => {
          const icon = coverageStatusIcon[row.status];
          return (
            <div
              key={`${activePlan.id}-${row.name}`}
              className={`flex items-center justify-between gap-4 bg-white px-4 py-3 transition-colors hover:bg-[#F7F9FC] ${
                idx < activePlan.rows.length - 1
                  ? "border-b border-[rgba(24,95,165,0.08)]"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex size-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${icon.className}`}
                >
                  {icon.char}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#0E1420]">
                    {row.name}
                  </p>
                  <p className="text-xs font-light text-[#6B7280]">
                    {row.detail}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 text-right text-[13px] font-medium whitespace-nowrap ${coverageValueClasses[row.valueVariant]}`}
              >
                {row.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Benefit actions */}
      {activePlan.actions.length > 0 && (
        <div className="flex flex-col gap-2">
          {activePlan.actions.map((action) => {
            const cv = colorVariantClasses[action.colorVariant];
            return (
              <div
                key={action.title}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[rgba(24,95,165,0.15)] bg-white px-4 py-3.5 transition-all hover:-translate-y-px hover:border-[#185FA5] hover:shadow-[0_2px_12px_rgba(24,95,165,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[15px] ${cv.bg}`}
                  >
                    {action.emoji}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium text-[#0E1420]">
                      {action.title}
                    </p>
                    <p className="mt-px text-xs font-light text-[#6B7280]">
                      {action.subtitle}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#E6F1FB] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#185FA5] whitespace-nowrap">
                  {action.eta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
