import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/app");
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-white">
      {/* Subtle radial glow — Navara blue */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] size-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(24,95,165,0.05) 0%, transparent 70%)" }}
      />

      {/* Fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[rgba(24,95,165,0.12)] bg-white/90 px-6 backdrop-blur-md sm:px-8">
        <span className="font-[family-name:var(--font-dm-serif)] text-[20px] tracking-tight text-foreground">
          Nav<span className="text-primary">ara</span>
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-primary/25 text-primary text-[13px] hover:border-primary hover:bg-secondary",
            )}
          >
            Log in
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
        </div>
      </header>

      {/* Main content — vertically centered */}
      <main className="flex min-h-svh flex-col items-center justify-center px-4 pt-[60px] pb-10">
        <div className="flex w-full max-w-[620px] flex-col items-center text-center">
          {/* Logomark */}
          <div className="mb-5">
            <p className="font-[family-name:var(--font-dm-serif)] text-[52px] leading-none tracking-[-2px] text-foreground">
              Nav<span className="text-primary">ara</span>
            </p>
            <p className="mt-2 text-[15px] font-light tracking-wide text-muted-foreground">
              Navigate care with confidence
            </p>
          </div>

          {/* Hero text */}
          <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.6rem]">
            Let&apos;s get you{" "}
            <span className="font-[family-name:var(--font-dm-serif)] font-normal italic text-primary">
              to the right care.
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Answer a few quick questions and we&apos;ll route you to the right care — usually without a wait.
          </p>

          {/* Primary CTA */}
          <div className="mt-10 w-full max-w-sm">
            <Link
              href="/app"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full text-[15px] font-semibold shadow-[0_4px_24px_rgba(24,95,165,0.18)] hover:bg-primary/90 active:scale-[0.98]",
              )}
            >
              Start your intake
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="ml-1"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {/* Example prompts */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {[
              "I have a persistent headache",
              "My knee has been aching",
              "I need a medication refill",
              "Trouble sleeping lately",
            ].map((chip) => (
              <Link
                key={chip}
                href="/app"
                className="rounded-full border border-border bg-[#F7F9FC] px-3.5 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/25 hover:bg-secondary hover:text-primary"
              >
                {chip}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-lg leading-relaxed">
          <strong className="text-foreground font-medium">Medical disclaimer:</strong>{" "}
          Navara is not a substitute for professional medical advice, diagnosis, or treatment.
          Always consult a qualified healthcare provider for your specific situation.
        </p>
        <div className="flex gap-4">
          <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}
