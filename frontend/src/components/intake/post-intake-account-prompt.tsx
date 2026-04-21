"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PostIntakeAccountPrompt() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || isSignedIn) return null;

  return (
    <div className="mt-6 border-t border-black/8 pt-6">
      <p className="text-sm font-semibold text-foreground">Save your results</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a free account to keep your intake summary and share it with your care team.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/sign-up"
          className={cn(
            buttonVariants({ size: "sm" }),
            "text-[13px] font-medium shadow-[0_2px_10px_rgba(24,95,165,0.15)] hover:bg-primary/90 active:scale-[0.98]",
          )}
        >
          Create account
        </Link>
        <Link
          href="/sign-in"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-primary/25 text-primary text-[13px] hover:border-primary hover:bg-secondary active:scale-[0.98]",
          )}
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
