import type { ProfileCard as ProfileCardType } from "@/types/recommendation";
import { Card, CardContent } from "@/components/ui/card";
import { badgeVariantClasses } from "./variant-styles";

export function ProfileCard({ profile }: { profile: ProfileCardType }) {
  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Your profile
      </p>
      <Card className="rounded-2xl border-[rgba(24,95,165,0.08)] shadow-none">
        <CardContent className="p-6">
          {/* Header: location + badges */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-[#0E1420]">
                {profile.location}
              </p>
              <p className="text-[13px] font-light text-[#6B7280]">
                {profile.meta}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.badges.map((b) => (
                <span
                  key={b.label}
                  className={`rounded-full px-2.5 py-[3px] text-[11px] font-medium ${badgeVariantClasses[b.variant]}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-5 h-px bg-[rgba(24,95,165,0.08)]" />

          {/* Two-column facts */}
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <FactColumn column={profile.left} className="sm:border-r sm:border-[rgba(24,95,165,0.08)] sm:pr-6" />
            <FactColumn column={profile.right} className="mt-4 border-t border-[rgba(24,95,165,0.08)] pt-4 sm:mt-0 sm:border-t-0 sm:pt-0 sm:pl-6" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function FactColumn({
  column,
  className,
}: {
  column: ProfileCardType["left"];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">
        {column.heading}
      </p>
      <div className="flex flex-col gap-2">
        {column.facts.map((f) => (
          <div
            key={f.text}
            className="flex items-start gap-[9px] text-[13px] font-light leading-[1.5] text-[#6B7280]"
          >
            <span className="mt-px shrink-0 text-[13px]">{f.emoji}</span>
            {f.text}
          </div>
        ))}
      </div>
    </div>
  );
}
