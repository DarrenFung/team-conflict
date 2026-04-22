import { cn } from "@/lib/utils";
import type { AdvocacyItem } from "@/types/recommendation";

interface Props {
  items: AdvocacyItem[];
}

export function CareAdvocacySection({ items }: Props) {
  return (
    <section className="border-b border-border py-8">
      <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
        Care advocacy
      </p>

      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "flex cursor-pointer items-center gap-[13px] py-[13px] transition-opacity hover:opacity-65",
            i > 0 && "border-t border-border",
            i === 0 && "pt-0.5",
          )}
        >
          <div
            className={cn(
              "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[14px]",
              item.bgClass,
            )}
          >
            {item.emoji}
          </div>
          <div className="flex-1">
            <p className="text-[13.5px] font-medium text-foreground">{item.title}</p>
            <p className="mt-px text-[12px] text-muted-foreground">{item.subtitle}</p>
          </div>
          <span className="text-[13px] text-muted-foreground/40">→</span>
        </div>
      ))}
    </section>
  );
}
