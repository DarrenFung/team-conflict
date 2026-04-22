import type { Insight } from "@/types/recommendation";
import { colorVariantClasses } from "./variant-styles";

export function KeyInsights({ insights }: { insights: Insight[] }) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Key insights
      </p>

      {insights.map((insight, idx) => {
        const cv = colorVariantClasses[insight.colorVariant];
        return (
          <div
            key={insight.name}
            className={`py-[18px] ${idx > 0 ? "border-t border-[rgba(24,95,165,0.08)]" : ""}`}
          >
            <div className="mb-1.5 flex items-center gap-2.5">
              <div
                className={`flex size-7 items-center justify-center rounded-lg text-[13px] ${cv.bg}`}
              >
                {insight.emoji}
              </div>
              <span className="text-sm font-semibold text-[#0E1420]">
                {insight.name}
              </span>
            </div>
            <p className="text-[13px] font-light leading-[1.65] text-[#6B7280]">
              {insight.body}
            </p>
            {insight.bar && (
              <div className="mt-2 flex items-center gap-2.5">
                <span className="min-w-[80px] text-[11px] text-[#9CA3AF]">
                  {insight.bar.label}
                </span>
                <div className="flex-1 h-[3px] rounded-sm bg-[rgba(24,95,165,0.08)] overflow-hidden">
                  <div
                    className={`h-full rounded-sm ${colorVariantClasses[insight.bar.colorVariant].bg.replace("bg-", "bg-")}`}
                    style={{
                      width: `${insight.bar.value}%`,
                      backgroundColor:
                        insight.bar.colorVariant === "teal"
                          ? "#0F6E56"
                          : insight.bar.colorVariant === "blue"
                            ? "#185FA5"
                            : insight.bar.colorVariant === "amber"
                              ? "#7a5c00"
                              : insight.bar.colorVariant === "purple"
                                ? "#534AB7"
                                : insight.bar.colorVariant === "red"
                                  ? "#A32D2D"
                                  : "#6B7280",
                    }}
                  />
                </div>
                <span className="min-w-7 text-right text-[11px] text-[#9CA3AF]">
                  {insight.bar.value}%
                </span>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
