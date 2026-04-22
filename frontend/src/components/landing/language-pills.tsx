"use client";

import { useState } from "react";
import { LANGUAGE_OPTIONS } from "@/lib/ask-luke-landing";
import { cn } from "@/lib/utils";

export function LanguagePills() {
  const [active, setActive] = useState("en");

  function handleSelect(code: string) {
    setActive(code);
    if (typeof document !== "undefined") {
      document.documentElement.lang = code;
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground">
        AskLuke available in:
      </p>
      <div className="flex flex-wrap justify-center gap-0">
        {LANGUAGE_OPTIONS.map(({ code, label }, i) => (
          <span key={code} className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelect(code)}
              className={cn(
                "rounded px-2 py-0.5 text-[12px] font-normal text-primary transition-all hover:bg-[#E6F1FB]",
                active === code && "font-semibold text-[#0e4a87] underline underline-offset-[3px]",
              )}
            >
              {label}
            </button>
            {i < LANGUAGE_OPTIONS.length - 1 && (
              <span className="text-[10px] text-[rgba(24,95,165,0.25)]">·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
