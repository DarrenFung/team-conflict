import type { CareResource } from "@/types/recommendation";
import { colorVariantClasses } from "./variant-styles";

export function CareResources({ resources }: { resources: CareResource[] }) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Care resources
      </p>

      {resources.map((r, idx) => {
        const cv = colorVariantClasses[r.colorVariant];
        return (
          <div
            key={r.title}
            className={`flex items-center gap-3 py-3 ${
              idx > 0
                ? "border-t border-[rgba(24,95,165,0.08)]"
                : ""
            } cursor-pointer transition-opacity hover:opacity-60`}
          >
            <div
              className={`flex size-[30px] shrink-0 items-center justify-center rounded-lg text-[13px] ${cv.bg}`}
            >
              {r.emoji}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#0E1420]">
                {r.title}
              </p>
              <p className="mt-px text-xs text-[#6B7280]">{r.subtitle}</p>
            </div>
            <span className="text-[13px] text-[#9CA3AF]">&rarr;</span>
          </div>
        );
      })}
    </section>
  );
}
