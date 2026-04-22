import type { UrgencyBar as UrgencyBarType } from "@/types/recommendation";
import { urgencyVariantClasses } from "./variant-styles";

export function UrgencyBar({ urgency }: { urgency: UrgencyBarType }) {
  const v = urgencyVariantClasses[urgency.variant];

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3.5 px-[18px] text-[13.5px] leading-[1.55] ${v.bg} ${v.border} ${v.text}`}
    >
      <span className="size-2 shrink-0 rounded-full bg-current" />
      <span className="flex-1">{urgency.message}</span>
    </div>
  );
}
