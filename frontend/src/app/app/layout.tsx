export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-svh overflow-hidden bg-[#f0f7f2] [font-family:Arial,Helvetica,sans-serif] antialiased"
    >
      {/* Depth blobs — solid fills, no gradients */}
      <div className="pointer-events-none absolute -left-32 -top-32 size-[520px] rounded-full bg-[#a8d5b5] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 size-[400px] rounded-full bg-[#6dbf8a] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[360px] rounded-full bg-[#c6e8d0] opacity-25 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
