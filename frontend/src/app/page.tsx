"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AskLukeWordmark } from "@/components/landing/ask-luke-wordmark";
import { TrendingPrompts } from "@/components/landing/trending-prompts";
import { LanguagePills } from "@/components/landing/language-pills";

function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(14,20,32,0.45)] p-6 backdrop-blur-[4px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[540px] overflow-hidden rounded-[20px] bg-white shadow-[0_20px_60px_rgba(14,20,32,0.2)]">
        <div className="flex items-start justify-between px-7 pt-6 pb-0">
          <div>
            <p className="font-[family-name:var(--font-dm-serif)] text-[22px] tracking-tight text-foreground">
              Ask<span className="text-primary">Luke</span>
            </p>
            <p className="text-[12px] text-muted-foreground">navigate care with confidence</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg border border-[rgba(24,95,165,0.12)] text-sm text-muted-foreground transition-colors hover:bg-[#F7F9FC]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-7 py-5 max-h-[70vh]">
          <div className="mb-5">
            <h3 className="mb-1.5 text-sm font-semibold text-foreground">What is AskLuke?</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AskLuke is an AI-powered health navigation platform that helps patients find the right
              care — faster and with less confusion. We connect your symptoms, benefits coverage, and
              location to surface the best-matched, in-network care options personalized to you.
            </p>
          </div>
          <div className="mb-5">
            <h3 className="mb-1.5 text-sm font-semibold text-foreground">How it works</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Describe what&apos;s going on in plain language. AskLuke&apos;s AI guides you through a
              few follow-up questions, checks your benefits coverage and EAP access, and generates a
              clear pathway — with ranked provider recommendations, estimated costs, and a
              step-by-step action plan.
            </p>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              { icon: "🧑‍⚕️", title: "For patients", desc: "Clear, personalized care pathways — no more guessing where to start." },
              { icon: "🏢", title: "For employers & HR", desc: "Reduce benefits confusion and absenteeism across your team." },
              { icon: "🏥", title: "For health providers", desc: "Receive better-prepared, right-fit patients with less intake friction." },
              { icon: "🛡️", title: "For insurers", desc: "Reduce unnecessary claims by routing members to appropriate care." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-[rgba(24,95,165,0.1)] bg-[#F7F9FC] p-4">
                <div className="mb-1.5 text-xl">{icon}</div>
                <div className="mb-1 text-xs font-semibold text-foreground">{title}</div>
                <div className="text-xs leading-relaxed text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[rgba(24,95,165,0.1)] bg-[#F7F9FC] p-4 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">Medical disclaimer:</strong> AskLuke is a
            health system navigation tool only. It does not provide medical diagnoses, clinical advice,
            or treatment recommendations. Always consult a qualified healthcare professional before making
            any medical decisions. In an emergency, call 911 immediately.
            <br />
            <br />
            AskLuke is currently in early access. Toronto, Canada ·{" "}
            <a href="mailto:hello@askluke.ca" className="text-primary hover:underline">hello@askluke.ca</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/app");
    }
  }, [isLoaded, isSignedIn, router]);

  function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/app");
      return;
    }
    router.push("/app?reason=" + encodeURIComponent(trimmed));
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-white">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] size-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(24,95,165,0.05) 0%, transparent 70%)" }}
      />

      {/* Fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[rgba(24,95,165,0.12)] bg-white/90 px-6 backdrop-blur-[10px] sm:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-dm-serif)] text-[20px] tracking-tight text-foreground"
        >
          Ask<span className="text-primary">Luke</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="hidden rounded-lg border-none bg-transparent px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-[#F7F9FC] hover:text-foreground sm:block"
          >
            About
          </button>
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-primary/25 text-primary text-[13px] hover:border-primary hover:bg-secondary",
                )}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "text-[13px] font-medium shadow-[0_2px_10px_rgba(24,95,165,0.2)] hover:bg-primary/90",
                )}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main — vertically centered */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-[60px] pb-10">
        <div className="flex w-full max-w-[620px] flex-col items-center text-center">
          {/* Wordmark + tagline */}
          <div className="mb-5">
            <AskLukeWordmark size="hero" />
            <p className="mt-2 text-[15px] font-light tracking-[0.01em] text-muted-foreground">
              navigate care with confidence
            </p>
          </div>

          {/* Search card */}
          <div
            className={cn(
              "w-full overflow-hidden rounded-[14px] border-[1.5px] border-[rgba(24,95,165,0.2)] bg-white shadow-[0_2px_16px_rgba(24,95,165,0.06)] transition-[border-color,box-shadow] duration-200",
              "focus-within:border-primary focus-within:shadow-[0_4px_24px_rgba(24,95,165,0.12)]",
            )}
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="What is going on with your health today?"
              rows={2}
              className="block w-full resize-none bg-transparent px-5 pt-[18px] pb-3.5 text-[16px] leading-[1.55] text-foreground placeholder:text-[#A0AEC0] focus:outline-none"
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between border-t border-[rgba(24,95,165,0.12)] px-2.5 py-2.5">
              <div className="flex items-center">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-[rgba(24,95,165,0.12)] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[rgba(24,95,165,0.25)] hover:bg-[#E6F1FB] hover:text-primary"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M1 11l4-4 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  Photo / Video / File
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(24,95,165,0.25)] transition-transform hover:bg-[#0e4a87] active:scale-[1.04]"
                aria-label="Ask Luke"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Trending prompts */}
          <TrendingPrompts onSelect={(text) => {
            setQuery(text);
            textareaRef.current?.focus();
          }} />

          {/* Language pills */}
          <LanguagePills />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(24,95,165,0.12)] px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-lg leading-relaxed">
          <strong className="text-foreground font-medium">Medical disclaimer:</strong>{" "}
          AskLuke provides health system navigation and care pathway guidance only. It is not a
          substitute for professional medical advice, diagnosis, or treatment. Always consult a
          qualified healthcare provider for medical concerns. In an emergency, call 911 or go to
          your nearest emergency department.
        </p>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            About
          </button>
          <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-primary">Privacy</a>
          <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-primary">Terms</a>
          <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-primary">Contact</a>
        </div>
      </footer>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
