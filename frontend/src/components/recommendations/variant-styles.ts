import type {
  BadgeVariant,
  ColorVariant,
  CoverageStatus,
  StatVariant,
  StatusVariant,
  UrgencyVariant,
} from "@/types/recommendation";

export const colorVariantClasses: Record<
  ColorVariant,
  { bg: string; text: string }
> = {
  blue: { bg: "bg-[#E6F1FB]", text: "text-[#185FA5]" },
  teal: { bg: "bg-[#E1F5EE]", text: "text-[#0F6E56]" },
  purple: { bg: "bg-[#EEEDFE]", text: "text-[#534AB7]" },
  amber: { bg: "bg-[#FFF6B6]", text: "text-[#7a5c00]" },
  red: { bg: "bg-[#FCEBEB]", text: "text-[#A32D2D]" },
  gray: { bg: "bg-[#F7F9FC]", text: "text-[#6B7280]" },
};

export const badgeVariantClasses: Record<
  BadgeVariant,
  string
> = {
  blue: "bg-[#E6F1FB] text-[#185FA5]",
  teal: "bg-[#E1F5EE] text-[#0F6E56]",
  purple: "bg-[#EEEDFE] text-[#534AB7]",
  surface: "bg-[#F7F9FC] text-[#6B7280] border border-[rgba(24,95,165,0.15)]",
};

export const statusVariantClasses: Record<
  StatusVariant,
  string
> = {
  green: "bg-[#E1F5EE] text-[#0F6E56]",
  amber: "bg-[#FFF6B6] text-[#7a5c00]",
  coral: "bg-[#FCEBEB] text-[#A32D2D]",
};

export const urgencyVariantClasses: Record<
  UrgencyVariant,
  { bg: string; border: string; text: string }
> = {
  "non-urgent": {
    bg: "bg-[#E1F5EE]",
    border: "border-[rgba(15,110,86,0.18)]",
    text: "text-[#0F6E56]",
  },
  moderate: {
    bg: "bg-[#FFF6B6]",
    border: "border-[rgba(122,92,0,0.18)]",
    text: "text-[#7a5c00]",
  },
  urgent: {
    bg: "bg-[#FCEBEB]",
    border: "border-[rgba(163,45,45,0.18)]",
    text: "text-[#A32D2D]",
  },
};

export const coverageStatusIcon: Record<CoverageStatus, { char: string; className: string }> = {
  ok: { char: "\u2713", className: "bg-[#E1F5EE] text-[#0F6E56]" },
  warn: { char: "~", className: "bg-[#FFF6B6] text-[#7a5c00]" },
  no: { char: "\u2715", className: "bg-[#FCEBEB] text-[#A32D2D]" },
  info: { char: "i", className: "bg-[#E6F1FB] text-[#185FA5]" },
};

export const coverageValueClasses: Record<CoverageStatus, string> = {
  ok: "text-[#0F6E56]",
  warn: "text-[#7a5c00]",
  no: "text-[#A32D2D]",
  info: "text-[#185FA5]",
};

export const statVariantClasses: Record<StatVariant, string> = {
  neutral: "text-[#0E1420]",
  teal: "text-[#0F6E56]",
  amber: "text-[#7a5c00]",
};
