import type { PrimaryRecommendation as PrimaryRecType } from "@/types/recommendation";
import { colorVariantClasses, statusVariantClasses } from "./variant-styles";

export function PrimaryRecommendation({
  recommendation,
}: {
  recommendation: PrimaryRecType;
}) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Recommendation
      </p>

      <div className="mb-2.5 flex items-start justify-between gap-4">
        <h2 className="font-[family-name:var(--font-dm-serif)] text-[1.6rem] leading-[1.15] tracking-[-0.03em] text-[#0E1420]">
          {recommendation.title}
        </h2>
        <span
          className={`mt-1 inline-flex shrink-0 items-center gap-[5px] rounded-full px-[11px] py-1 text-[11.5px] font-medium whitespace-nowrap ${statusVariantClasses[recommendation.status.variant]}`}
        >
          <span className="size-[5px] rounded-full bg-current" />
          {recommendation.status.label}
        </span>
      </div>

      <p className="mb-1.5 text-[13.5px] font-light leading-[1.7] text-[#6B7280]">
        {recommendation.intro}
      </p>

      <div className="mt-2">
        {recommendation.actionRows.map((row) => {
          const cv = colorVariantClasses[row.colorVariant];
          return (
            <div
              key={row.title}
              className="grid grid-cols-[38px_1fr] gap-0 border-t border-[rgba(24,95,165,0.08)] py-[18px]"
            >
              <div
                className={`mt-0.5 flex size-[30px] items-center justify-center rounded-lg text-sm ${cv.bg}`}
              >
                {row.emoji}
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-[#0E1420]">
                  {row.title}
                </p>
                <div className="flex flex-col gap-[5px]">
                  {row.bullets.map((b) => (
                    <div
                      key={b}
                      className="flex items-start gap-2 text-[13px] font-light leading-[1.55] text-[#6B7280]"
                    >
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-[#9CA3AF]" />
                      {b}
                    </div>
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
