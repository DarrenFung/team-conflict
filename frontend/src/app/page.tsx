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
    <div className="relative min-h-svh overflow-hidden bg-[#f0f7f2] [font-family:Arial,Helvetica,sans-serif] antialiased">
      {/* Backdrop blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 size-[520px] rounded-full bg-[#a8d5b5] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 size-[400px] rounded-full bg-[#6dbf8a] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[360px] rounded-full bg-[#c6e8d0] opacity-25 blur-3xl" />

      <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-10 sm:px-6 lg:py-16">
        {/* Wordmark */}
        <header className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary shadow-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 2.5v4.3L9.3 9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.2" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Care<span className="font-normal text-foreground/55">Navigator</span>
          </span>
        </header>

        {/* Hero */}
        <div className="mt-16 sm:mt-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            Welcome
          </p>
          <h1 className="mt-3 text-[2.6rem] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Hello.{" "}
            <span className="italic font-normal text-primary">Let&apos;s get you</span>
            <br />
            to the right care.
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-foreground/60">
            Answer a few quick questions and we&apos;ll route you to the right care — usually without a wait.
          </p>
        </div>

        <div className="mt-auto pt-16">
          {/* Sign-in card */}
          <div
            className="rounded-2xl border border-white/50 bg-white/40 p-6 backdrop-blur-xl sm:p-7"
            style={{
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(0,60,30,0.06)",
            }}
          >
            <p className="mb-5 text-sm font-medium text-foreground/70">
              Sign in to continue
            </p>

            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full text-[15px] font-semibold hover:bg-primary/90 active:scale-[0.98] active:bg-primary/80",
              )}
            >
              Sign in
            </Link>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="text-xs text-foreground/40 uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>

            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full border-white/60 bg-white/50 text-[15px] font-medium hover:border-primary/30 hover:bg-white/70 active:scale-[0.98]",
              )}
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
