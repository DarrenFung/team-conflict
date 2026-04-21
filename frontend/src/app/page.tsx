import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">team-conflict</h1>
        <p className="text-muted-foreground">
          A chat agent for working through team conflict.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/sign-in" className={buttonVariants()}>
          Sign in
        </Link>
        <Link href="/sign-up" className={buttonVariants({ variant: "outline" })}>
          Create account
        </Link>
      </div>
    </main>
  );
}
