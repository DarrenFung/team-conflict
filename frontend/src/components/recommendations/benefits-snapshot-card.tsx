import type { BenefitsSnapshot } from "@/types/recommendation";
import { Card } from "@/components/ui/card";
import { statVariantClasses } from "./variant-styles";

export function BenefitsSnapshotCard({
  snapshot,
}: {
  snapshot: BenefitsSnapshot;
}) {
  return (
    <Card className="overflow-hidden rounded-[14px] border-[rgba(24,95,165,0.08)] shadow-none">
      <div className="border-b border-[rgba(24,95,165,0.08)] px-[18px] py-3.5">
        <p className="text-[13px] font-semibold text-[#0E1420]">
          Benefits snapshot
        </p>
        <p className="mt-0.5 text-xs text-[#6B7280]">{snapshot.planName}</p>
      </div>
      <div className="px-[18px] py-3.5">
        {snapshot.items.map((item, idx) => (
          <div
            key={item.label}
            className={`flex items-center justify-between py-[7px] text-[13px] ${
              idx < snapshot.items.length - 1
                ? "border-b border-[rgba(24,95,165,0.08)]"
                : ""
            }`}
          >
            <span className="text-[#6B7280]">{item.label}</span>
            <span className={`font-medium ${statVariantClasses[item.variant]}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
