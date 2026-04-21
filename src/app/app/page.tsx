import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function AppPage() {
  const user = await currentUser();
  const greetingName = user?.firstName ?? "there";

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">team-conflict</span>
        {/* @ts-ignore */}
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <h1 className="text-2xl font-semibold">Welcome, {greetingName}</h1>
      </main>
    </div>
  );
}
