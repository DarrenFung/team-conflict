import type { SourceArticle } from "@/types/recommendation";

export function SourceArticles({ articles }: { articles: SourceArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="py-8 border-b border-[rgba(24,95,165,0.08)]">
      <p className="mb-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        Sources
      </p>

      {articles.map((a, idx) => (
        <a
          key={a.url}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 py-3 ${
            idx > 0 ? "border-t border-[rgba(24,95,165,0.08)]" : ""
          } transition-opacity hover:opacity-60`}
        >
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-[rgba(24,95,165,0.06)] text-[13px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#185FA5]"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#0E1420]">{a.title}</p>
            <p className="mt-px text-xs text-[#6B7280]">Health811 Ontario</p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-[#9CA3AF]"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ))}
    </section>
  );
}
