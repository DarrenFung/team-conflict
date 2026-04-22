import type { ProfileColumn, ProfileFact } from "@/types/recommendation";

// Simple SVG icon set matching navara-rec.html icons
function FactIcon({ iconKey }: { iconKey: ProfileFact["iconKey"] }) {
  const cls = "size-4 shrink-0 text-muted-foreground/50";
  switch (iconKey) {
    case "user":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 8h14" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="7" cy="12" r="1" fill="currentColor" />
          <circle cx="10" cy="12" r="1" fill="currentColor" />
          <circle cx="13" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "pill":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="none">
          <rect x="6" y="3" width="8" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7v2m4-2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "drop":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="none">
          <path d="M10 3c0 0-4.5 5-4.5 9a4.5 4.5 0 009 0C14.5 8 10 3 10 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M7.5 13a2.5 2.5 0 004.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "heart":
    default:
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="none">
          <path d="M10 15s-7-4.35-7-8.5A4 4 0 0110 4.5 4 4 0 0117 6.5C17 10.65 10 15 10 15z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
  }
}

function ProfileCol({ col }: { col: ProfileColumn }) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold text-foreground">{col.heading}</p>
      <div className="flex flex-col gap-[11px]">
        {col.facts.map((fact, i) => (
          <div key={i} className="flex items-start gap-[11px] text-[13.5px] font-light leading-[1.4] text-muted-foreground">
            <FactIcon iconKey={fact.iconKey} />
            <span>{fact.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  left: ProfileColumn;
  right: ProfileColumn;
}

export function ProfileSituationSection({ left, right }: Props) {
  return (
    <section className="border-b border-border py-8">
      <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
        Profile &amp; situation
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-0">
        <div className="sm:border-r sm:border-border sm:pr-8">
          <ProfileCol col={left} />
        </div>
        <div className="sm:pl-8">
          <ProfileCol col={right} />
        </div>
      </div>
    </section>
  );
}
