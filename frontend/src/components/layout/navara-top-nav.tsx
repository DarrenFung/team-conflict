"use client";

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Fixed top nav — logo + auth actions. Shared across public pages. */
export function NavaraTopNav() {
  const { isSignedIn } = useUser();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[rgba(24,95,165,0.12)] bg-white/90 px-6 backdrop-blur-[10px] sm:px-8">
      <Link
        href="/"
        className="font-[family-name:var(--font-dm-serif)] text-[20px] tracking-tight text-foreground"
      >
        Nav<span className="text-primary">ara</span>
      </Link>
      <div className="flex items-center gap-2">
        {isSignedIn ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
