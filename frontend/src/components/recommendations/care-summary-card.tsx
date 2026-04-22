import type { CareSummary } from "@/types/recommendation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { statVariantClasses } from "./variant-styles";

export function CareSummaryCard({ summary }: { summary: CareSummary }) {
  return (
    <Card className="overflow-hidden rounded-[14px] border-[rgba(24,95,165,0.08)] shadow-none">
      {/* Header */}
      <div className="border-b border-[rgba(24,95,165,0.08)] px-[18px] py-3.5">
        <p className="text-[13px] font-semibold text-[#0E1420]">
          {summary.title}
        </p>
        <p className="mt-0.5 text-xs text-[#6B7280]">{summary.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="px-[18px] py-3.5">
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
            <span className={`font-medium ${statVariantClasses[stat.variant]}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Primary CTA */}
      <div className="px-[18px] pt-0 pb-1">
        <Button className="w-full rounded-lg bg-[#185FA5] text-[13px] font-medium hover:bg-[#0e4a87]">
          {summary.primaryAction.label}
        </Button>
      </div>

      {/* Secondary actions */}
      {summary.actions.map((action) => (
        <div
          key={action.label}
          className="flex cursor-pointer items-center justify-between border-t border-[rgba(24,95,165,0.08)] px-[18px] py-3 transition-colors hover:bg-[#F7F9FC]"
        >
          <div>
            <p className="text-[13px] font-medium text-[#0E1420]">
              {action.label}
            </p>
            <p className="text-[11.5px] text-[#6B7280]">{action.subtitle}</p>
          </div>
          <span className="text-xs text-[#9CA3AF]">&rarr;</span>
        </div>
      ))}

      {/* Disclaimer */}
      <div className="border-t border-[rgba(24,95,165,0.08)] px-[18px] py-3 text-[11px] leading-[1.65] text-[#6B7280]">
        <strong className="font-medium text-[#1A2033]">Not a diagnosis.</strong>{" "}
        AskLuke is a navigation tool. Always consult a qualified healthcare
        provider.
      </div>
    </Card>
  );
}
