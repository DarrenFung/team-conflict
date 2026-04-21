import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <SignIn />
      <Link href="/app" className={buttonVariants({ variant: "outline" })}>
        Skip for now
      </Link>
    </main>
  );
}
