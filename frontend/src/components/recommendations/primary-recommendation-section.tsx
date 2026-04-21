import { cn } from "@/lib/utils";
import type { PrimaryRecommendation, StatusVariant } from "@/types/recommendation";

const statusStyles: Record<StatusVariant, string> = {
  green: "bg-[#E8F5EC] text-[#1a7a3c]",
  amber: "bg-[#FEF3E2] text-[#7a4f0d]",
  coral: "bg-[#FDF0EE] text-[#a33228]",
};

interface Props {
  recommendation: PrimaryRecommendation;
}

export function PrimaryRecommendationSection({ recommendation }: Props) {
  return (
    <section className="border-b border-border py-8">
      <p className="mb-[14px] text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
        Recommendation
      </p>
      <div className="mb-2.5 flex items-start justify-between gap-4">
        <h2 className="font-[family-name:var(--font-dm-serif)] text-2xl leading-[1.15] tracking-tight text-foreground">
          {recommendation.title}
        </h2>
        <span
          className={cn(
            "mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-[11px] py-1 text-[11.5px] font-medium",
            statusStyles[recommendation.status.variant],
          )}
        >
          <span className="size-[5px] rounded-full bg-current" />
          {recommendation.status.label}
        </span>
      </div>
      <p className="mb-1 text-[13.5px] font-light leading-[1.65] text-muted-foreground">
        {recommendation.intro}
      </p>

      <div className="mt-2">
        {recommendation.actionRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr] gap-0 border-t border-border py-[18px]">
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[15px]",
                row.bgClass,
              )}
            >
              {row.emoji}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">{row.title}</p>
              <div className="flex flex-col gap-1.5">
                {row.bullets.map((b, j) => (
                  <div key={j} className="flex items-start gap-2 text-[13px] font-light leading-[1.55] text-muted-foreground">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
                    {b.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
