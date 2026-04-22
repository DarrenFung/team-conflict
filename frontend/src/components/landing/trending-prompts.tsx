"use client";

import { TRENDING_PROMPTS } from "@/lib/ask-luke-landing";

interface Props {
  onSelect?: (text: string) => void;
}

export function TrendingPrompts({ onSelect }: Props) {
  return (
    <div className="mt-4 flex w-full flex-col items-center gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {/* trending-up icon matching the HTML */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="23 6 13.5 15.5 8.5 10.5 1 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="17 6 23 6 23 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-primary">Trending</span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {TRENDING_PROMPTS.map(({ icon, text }) => (
          <button
            key={text}
            type="button"
            onClick={() => onSelect?.(text)}
            className="flex items-center gap-1.5 rounded-[22px] border border-[rgba(24,95,165,0.12)] bg-white px-3.5 py-[7px] text-[12.5px] text-foreground shadow-[0_1px_4px_rgba(24,95,165,0.05)] transition-all hover:border-[rgba(24,95,165,0.3)] hover:bg-[#E6F1FB] hover:text-primary"
          >
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#E6F1FB] text-[12px] transition-colors">
              {icon}
            </span>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
