"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(14,20,32,0.45)] p-6 backdrop-blur-[4px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[540px] overflow-hidden rounded-[20px] bg-white shadow-[0_20px_60px_rgba(14,20,32,0.2)]">
        {/* Header */}
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

        {/* Body */}
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

          {/* Grid cards */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              { icon: "🧑‍⚕️", title: "For patients", desc: "Clear, personalized care pathways — no more guessing where to start." },
              { icon: "🏢", title: "For employers & HR", desc: "Reduce benefits confusion and absenteeism across your team." },
              { icon: "🏥", title: "For health providers", desc: "Receive better-prepared, right-fit patients with less intake friction." },
              { icon: "🛡️", title: "For insurers", desc: "Reduce unnecessary claims by routing members to appropriate care." },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-[rgba(24,95,165,0.1)] bg-[#F7F9FC] p-4"
              >
                <div className="mb-1.5 text-xl">{icon}</div>
                <div className="mb-1 text-xs font-semibold text-foreground">{title}</div>
                <div className="text-xs leading-relaxed text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-[rgba(24,95,165,0.1)] bg-[#F7F9FC] p-4 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">Medical disclaimer:</strong> AskLuke is a
            health system navigation tool only. It does not provide medical diagnoses, clinical
            advice, or treatment recommendations. All information provided is for navigation and
            informational purposes only. Always consult a qualified healthcare professional before
            making any medical decisions. If you are experiencing a medical emergency, call 911
            immediately.
            <br />
            <br />
            AskLuke is currently in early access. Toronto, Canada ·{" "}
            <a href="mailto:hello@askluke.ca" className="text-primary hover:underline">
              hello@askluke.ca
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fixed top nav — AskLuke logo + About + auth actions. Shared across public pages. */
export function AskLukeTopNav() {
  const { isSignedIn } = useUser();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
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
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
