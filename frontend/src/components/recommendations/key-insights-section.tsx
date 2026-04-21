import { cn } from "@/lib/utils";
import type { Insight } from "@/types/recommendation";

interface Props {
  insights: Insight[];
}

export function KeyInsightsSection({ insights }: Props) {
  return (
    <section className="border-b border-border py-8">
      <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
        Key insights
      </p>

      {insights.map((insight, i) => (
        <div
          key={insight.id}
          className={cn("py-[18px]", i > 0 && "border-t border-border", i === 0 && "pt-1")}
        >
          <div className="mb-2 flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-[14px]",
                insight.bgClass,
              )}
            >
              {insight.emoji}
            </div>
            <span className="text-sm font-semibold text-foreground">{insight.name}</span>
          </div>
          <p className="text-[13px] font-light leading-[1.6] text-muted-foreground">
            {insight.body}
          </p>
          {insight.bar && (
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="min-w-[52px] text-[11px] text-muted-foreground/50">
                {insight.bar.label}
              </span>
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className={cn("h-full rounded-full", insight.bar.colorClass)}
                  style={{ width: `${insight.bar.value}%` }}
                />
              </div>
              <span className="min-w-[28px] text-right text-[11px] text-muted-foreground/50">
                {insight.bar.value}%
              </span>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
