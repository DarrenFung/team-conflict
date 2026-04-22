interface Props {
  size?: "nav" | "hero";
}

export function AskLukeWordmark({ size = "hero" }: Props) {
  if (size === "nav") {
    return (
      <span className="font-[family-name:var(--font-dm-serif)] text-[20px] tracking-tight text-foreground">
        Ask<span className="text-primary">Luke</span>
      </span>
    );
  }
  return (
    <p className="font-[family-name:var(--font-dm-serif)] text-[52px] leading-none tracking-[-2px] text-foreground">
      Ask<span className="text-primary">Luke</span>
    </p>
  );
}
