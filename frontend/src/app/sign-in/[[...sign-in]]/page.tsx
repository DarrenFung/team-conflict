import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

const clerkAppearance = {
  variables: {
    colorPrimary: "#185FA5",
    colorText: "#1A2033",
    colorTextSecondary: "#6B7280",
    colorBackground: "#ffffff",
    colorInputBackground: "#F7F9FC",
    colorInputText: "#1A2033",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-dm-sans), sans-serif",
  },
  elements: {
    card: "shadow-[0_8px_32px_rgba(24,95,165,0.08)] border border-[rgba(24,95,165,0.1)]",
    headerTitle: "font-[family-name:var(--font-dm-serif)] tracking-tight",
    formButtonPrimary:
      "bg-[#185FA5] hover:bg-[#0e4a87] shadow-[0_2px_10px_rgba(24,95,165,0.2)]",
  },
};

export default function SignInPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-white">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] size-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(24,95,165,0.05) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[rgba(24,95,165,0.12)] bg-white/90 px-6 backdrop-blur-md sm:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-dm-serif)] text-[20px] tracking-tight text-foreground"
        >
          Nav<span className="text-primary">ara</span>
        </Link>
        <Link
          href="/app"
          className="text-[13px] text-muted-foreground hover:text-primary transition-colors"
        >
          Back to intake
        </Link>
      </header>

      <main className="flex min-h-svh flex-col items-center justify-center px-4 pt-[60px] pb-10">
        <SignIn appearance={clerkAppearance} />
      </main>
    </div>
  );
}
