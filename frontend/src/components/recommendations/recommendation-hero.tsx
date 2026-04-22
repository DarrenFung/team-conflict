import type { RecommendationHero } from "@/types/recommendation";

interface Props {
  hero: RecommendationHero;
}

export function RecommendationHeroSection({ hero }: Props) {
  return (
    <div className="border-b border-border pb-8 pt-2">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#E6F1FB] px-2.5 py-1 text-xs font-medium text-primary">
        <span className="size-[5px] rounded-full bg-primary" />
        {hero.eyebrow}
      </div>
      <h1 className="mb-1.5 font-[family-name:var(--font-dm-serif)] text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[1.05] tracking-tight text-foreground">
        {hero.title}
      </h1>
      <p className="max-w-[540px] text-sm font-light leading-relaxed text-muted-foreground">
        {hero.subtitle}
      </p>
    </div>
  );
}
