import { cn } from "@/lib/utils";
import type { JourneyStep } from "@/types/recommendation";

interface Props {
  steps: JourneyStep[];
}

export function JourneyBar({ steps }: Props) {
  return (
    <div className="fixed inset-x-0 top-[60px] z-40 border-b border-border bg-white">
      <div className="mx-auto flex h-[52px] max-w-[1120px] items-center px-7">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <div
              className={cn(
                "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                step.state === "done" &&
                  "border-[#9dc3e0] bg-[#E6F1FB] text-primary",
                step.state === "active" &&
                  "border-foreground bg-foreground text-white",
                step.state === "upcoming" &&
                  "border-border bg-[#f5f5f5] text-muted-foreground/40",
              )}
            >
              {step.state === "done" ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "hidden min-w-0 truncate text-[11.5px] sm:block",
                step.state === "done" && "text-muted-foreground",
                step.state === "active" && "font-medium text-foreground",
                step.state === "upcoming" && "text-muted-foreground/40",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
