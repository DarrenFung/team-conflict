import type { ReactNode } from "react";

interface Props {
  main: ReactNode;
  sidebar: ReactNode;
}

export function RecommendationShell({ main, sidebar }: Props) {
  return (
    <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-0 px-5 pb-20 pt-[calc(60px+52px+32px)] align-start sm:px-7 lg:grid-cols-[1fr_288px]">
      <div className="min-w-0 lg:pr-[52px]">{main}</div>
      <div className="mt-6 lg:sticky lg:top-[calc(60px+52px+24px)] lg:mt-0 lg:self-start">
        {sidebar}
      </div>
    </div>
  );
}
