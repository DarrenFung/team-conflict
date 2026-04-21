import { cn } from "@/lib/utils";
import type { CareSummary } from "@/types/recommendation";

interface Props {
  summary: CareSummary;
}

const statValueCls = {
  neutral: "text-foreground",
  warn: "text-[#7a4f0d]",
  positive: "text-[#1a7a3c]",
};

export function CareSummaryCard({ summary }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      {/* Head */}
      <div className="border-b border-border px-5 pb-[13px] pt-4">
        <p className="text-[13px] font-semibold text-foreground">{summary.title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{summary.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="px-5 py-[14px]">
        {summary.stats.map((stat, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between py-2",
              i < summary.stats.length - 1 && "border-b border-border",
            )}
          >
            <span className="text-[12.5px] text-muted-foreground">{stat.label}</span>
            <span
              className={cn(
                "text-[13px] font-semibold",
                statValueCls[stat.variant],
                stat.variant === "positive" &&
                  "inline-flex items-center gap-1 rounded-full bg-[#E8F5EC] px-2.5 py-0.5 text-[11px]",
              )}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {summary.actions.map((action) => (
        <div
          key={action.id}
          className="flex cursor-pointer items-center justify-between border-t border-border px-5 py-3 transition-colors hover:bg-[#fafafa]"
        >
          <div>
            <p className="text-[13px] font-medium text-foreground">{action.label}</p>
            <p className="text-[11.5px] text-muted-foreground">{action.subtitle}</p>
          </div>
          <span className="text-[12px] text-muted-foreground/40">→</span>
        </div>
      ))}

      {/* Disclaimer */}
      <div className="border-t border-border px-5 py-[14px] text-[11.5px] leading-[1.65] text-muted-foreground/50">
        <strong className="font-medium text-muted-foreground">Not a diagnosis.</strong> Navara is a
        navigation tool only. Always consult a qualified healthcare provider.
      </div>
    </div>
  );
}
