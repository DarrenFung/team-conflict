export function HeroSection() {
  return (
    <section className="pb-8 border-b border-[rgba(24,95,165,0.08)]">
      <h1 className="font-[family-name:var(--font-dm-serif)] text-[clamp(28px,3.8vw,42px)] tracking-[-0.6px] leading-[1.05] text-[#0E1420]">
        Your recommendation
      </h1>
      <p className="mt-2.5 max-w-[500px] text-sm font-light leading-[1.7] text-[#6B7280]">
        Based on your symptoms, coverage, and location — here&apos;s the
        clearest path to getting better.
      </p>
    </section>
  );
}
