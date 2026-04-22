"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Check, Loader2, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import { recordAttachment } from "@/app/actions/attachments";
import type {
  PersonalizationLocation,
  PersonalizationHealthProfile,
  PersonalizationEap,
} from "@/app/api/intake/personalize/route";

// ── Types ─────────────────────────────────────────────────────────────────────

type CardId = "hc" | "benefits" | "eap" | "wearable" | "profile";

type FileCardState = {
  open: boolean;
  done: boolean;
  files: File[];
  uploading: boolean;
};

type EapState = {
  open: boolean;
  done: boolean;
  provider: string;
  accessCode: string;
  files: File[];
  uploading: boolean;
};

type WearableState = {
  open: boolean;
  done: boolean;
  connected: Set<string>;
};

type ProfileState = {
  open: boolean;
  done: boolean;
  conditions: string;
  medications: string;
  allergies: string;
};

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | {
      status: "granted";
      lat: number;
      lng: number;
      city?: string;
      province?: string;
      country?: string;
      display: string;
    }
  | { status: "denied"; message: string };

// ── Sub-components ────────────────────────────────────────────────────────────

function fmt(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function CardStatusBadge({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        done
          ? "bg-[#E1F5EE] text-[#0F6E56]"
          : "border border-[rgba(24,95,165,0.12)] bg-[#F7F9FC] text-muted-foreground",
      )}
    >
      {done ? "Added" : "Attach"}
    </span>
  );
}

function CardChevron({ open }: { open: boolean }) {
  return open ? (
    <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
  ) : (
    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
  );
}

function CardIcon({ emoji, done, active }: { emoji: string; done: boolean; active: boolean }) {
  return (
    <div
      className={cn(
        "flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[17px] transition-colors",
        done ? "bg-[#E1F5EE]" : active ? "bg-[#E6F1FB]" : "bg-[#F7F9FC]",
      )}
    >
      {emoji}
    </div>
  );
}

function CardRationale({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3.5 rounded-md border-l-2 border-[rgba(24,95,165,0.22)] bg-[#F7F9FC] px-3 py-2.5 text-[12px] leading-[1.55] text-muted-foreground">
      {children}
    </div>
  );
}

function SkipLink({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="mt-3.5 inline-block text-[12px] text-muted-foreground transition-colors hover:text-primary"
    >
      Skip this →
    </button>
  );
}

type UploadZoneProps = {
  icon: string;
  title: string;
  subtitle: React.ReactNode;
  accept: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

function UploadZone({ icon, title, subtitle, accept, onFiles, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={cn(
        "mt-3.5 cursor-pointer rounded-lg border-[1.5px] border-dashed border-[rgba(24,95,165,0.22)] px-4 py-6 text-center transition-all",
        dragging && "border-primary bg-[#E6F1FB]",
        !disabled && "hover:border-primary hover:bg-[#E6F1FB]",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled && e.dataTransfer.files.length) {
          onFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <div className="mb-1.5 text-[22px]">{icon}</div>
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function FilePreviews({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (i: number) => void;
}) {
  if (!files.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-[rgba(24,95,165,0.15)] bg-[#F7F9FC] px-2.5 py-1.5"
        >
          <span className="text-[12px]">{f.type.startsWith("image/") ? "🖼️" : "📄"}</span>
          <span className="max-w-[120px] truncate text-[11px] font-medium text-foreground">
            {f.name}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{fmt(f.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${f.name}`}
            className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M1 1l10 10M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function CardInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-3.5">
      <label className="mb-1 block text-[12px] text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border-[1.5px] border-[rgba(24,95,165,0.22)] bg-white px-3.5 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-[#C0C8D2] focus:border-primary"
      />
    </div>
  );
}

function ConnectBtn({
  label,
  connected,
  onClick,
}: {
  label: string;
  connected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 py-3 text-[13px] font-medium transition-all",
        connected
          ? "border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]"
          : "border-[rgba(24,95,165,0.22)] bg-white text-foreground hover:border-primary hover:bg-[#E6F1FB] hover:text-primary",
      )}
    >
      {connected && <Check className="size-3.5" />}
      {connected ? "Connected" : label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type PersonalizeScreenProps = {
  encounterId: string | null;
  anonymousAccessToken: string | undefined;
  onComplete: () => void;
};

export function PersonalizeScreen({
  encounterId,
  anonymousAccessToken,
  onComplete,
}: PersonalizeScreenProps) {
  // ── Card states ──────────────────────────────────────────────────────────────
  const [hc, setHc] = useState<FileCardState>({
    open: false,
    done: false,
    files: [],
    uploading: false,
  });
  const [benefits, setBenefits] = useState<FileCardState>({
    open: false,
    done: false,
    files: [],
    uploading: false,
  });
  const [eap, setEap] = useState<EapState>({
    open: false,
    done: false,
    provider: "",
    accessCode: "",
    files: [],
    uploading: false,
  });
  const [wearable, setWearable] = useState<WearableState>({
    open: false,
    done: false,
    connected: new Set(),
  });
  const [profile, setProfile] = useState<ProfileState>({
    open: false,
    done: false,
    conditions: "",
    medications: "",
    allergies: "",
  });
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Location ─────────────────────────────────────────────────────────────────
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocation({ status: "denied", message: "Geolocation is not supported by your browser." });
      return;
    }
    setLocation({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let display = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en" } },
          );
          if (res.ok) {
            const data = (await res.json()) as {
              address?: {
                city?: string;
                town?: string;
                village?: string;
                state?: string;
                country?: string;
              };
            };
            const addr = data.address ?? {};
            const city = addr.city ?? addr.town ?? addr.village ?? "";
            const province = addr.state ?? "";
            if (city || province) {
              display = [city, province].filter(Boolean).join(", ");
            }
            setLocation({
              status: "granted",
              lat,
              lng,
              city: city || undefined,
              province: province || undefined,
              country: addr.country || undefined,
              display:
                [city || undefined, province || undefined, addr.country || undefined]
                  .filter(Boolean)
                  .join(", ") || display,
            });
            return;
          }
        } catch {
          // Nominatim failed — fall back to raw coordinates
        }
        setLocation({ status: "granted", lat, lng, display });
      },
      (err) => {
        setLocation({ status: "denied", message: err.message });
      },
      { timeout: 10_000 },
    );
  }, []);

  // ── File upload helpers ───────────────────────────────────────────────────────
  async function uploadFiles(files: File[], description: string): Promise<void> {
    for (const f of files) {
      const contentType = f.type || "application/octet-stream";
      const blob = await upload(f.name, f, {
        access: "private",
        handleUploadUrl: "/api/attachments/upload",
        contentType,
      });
      await recordAttachment({
        encounterId,
        url: blob.url,
        pathname: blob.pathname,
        originalFilename: f.name,
        contentType,
        sizeBytes: f.size,
        description,
      });
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Upload files in parallel
      const uploads: Promise<void>[] = [];
      if (hc.files.length > 0) uploads.push(uploadFiles(hc.files, "Health card"));
      if (benefits.files.length > 0) uploads.push(uploadFiles(benefits.files, "Benefits booklet"));
      if (eap.files.length > 0) uploads.push(uploadFiles(eap.files, "EAP card / welcome letter"));
      await Promise.all(uploads);

      // Build personalization payload
      const locationPayload: PersonalizationLocation | undefined =
        location.status === "granted"
          ? {
              lat: location.lat,
              lng: location.lng,
              city: location.city,
              province: location.province,
              country: location.country,
            }
          : undefined;

      const healthProfile: PersonalizationHealthProfile = {
        conditions: profile.conditions.trim() || undefined,
        medications: profile.medications.trim() || undefined,
        allergies: profile.allergies.trim() || undefined,
      };

      const eapPayload: PersonalizationEap = {
        provider: eap.provider.trim() || undefined,
        accessCode: eap.accessCode.trim() || undefined,
      };

      const wearableConnections = Array.from(wearable.connected);

      await fetch("/api/intake/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId,
          ...(anonymousAccessToken ? { anonymousAccessToken } : {}),
          ...(locationPayload ? { location: locationPayload } : {}),
          ...(Object.values(healthProfile).some(Boolean) ? { healthProfile } : {}),
          ...(Object.values(eapPayload).some(Boolean) ? { eap: eapPayload } : {}),
          ...(wearableConnections.length > 0 ? { wearableConnections } : {}),
        }),
      });

      onComplete();
    } catch (err) {
      console.error("[personalize] submit failed", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Card togglers ─────────────────────────────────────────────────────────────
  function toggleCard(id: CardId) {
    if (id === "hc") setHc((s) => ({ ...s, open: !s.open }));
    else if (id === "benefits") setBenefits((s) => ({ ...s, open: !s.open }));
    else if (id === "eap") setEap((s) => ({ ...s, open: !s.open }));
    else if (id === "wearable") setWearable((s) => ({ ...s, open: !s.open }));
    else if (id === "profile") setProfile((s) => ({ ...s, open: !s.open }));
  }

  function skipCard(id: CardId) {
    if (id === "hc") setHc((s) => ({ ...s, open: false }));
    else if (id === "benefits") setBenefits((s) => ({ ...s, open: false }));
    else if (id === "eap") setEap((s) => ({ ...s, open: false }));
    else if (id === "wearable") setWearable((s) => ({ ...s, open: false }));
    else if (id === "profile") setProfile((s) => ({ ...s, open: false }));
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-4 duration-400 flex flex-col gap-0"
    >
      {/* Page header */}
      <p className="mb-4 text-[13px] font-medium text-primary opacity-80">Step 4 of 5</p>
      <h1 className="mb-3 font-[family-name:var(--font-dm-serif)] text-[clamp(24px,3.8vw,34px)] leading-[1.25] tracking-[-0.5px] text-[#0E1420]">
        Let&apos;s personalize your pathway
      </h1>

      {/* Luke balloon */}
      <div className="mb-8 inline-flex max-w-full items-start gap-2 rounded-[0_10px_10px_10px] border border-[rgba(24,95,165,0.15)] bg-[#E6F1FB] px-3.5 py-2.5 text-[12px] leading-[1.6] text-[#0e4a87]">
        <span
          aria-hidden
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-dm-serif)] text-[10px] text-white"
        >
          L
        </span>
        Everything here is optional — but the more you share, the more accurate your recommendations
        will be. Skip anything you&apos;re not comfortable with.
      </div>

      {/* ── Location ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-[rgba(24,95,165,0.12)] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[17px]",
                location.status === "granted" ? "bg-[#E1F5EE]" : "bg-[#F7F9FC]",
              )}
            >
              📍
            </div>
            <div>
              <p className="text-[15px] font-medium text-[#0E1420]">Your location</p>
              <p className="text-[12px] text-muted-foreground">
                Helps us surface nearby providers and services
              </p>
            </div>
          </div>
          {location.status === "idle" && (
            <button
              type="button"
              onClick={requestLocation}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(24,95,165,0.22)] px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-[#E6F1FB]"
            >
              <MapPin className="size-3.5" />
              Use my location
            </button>
          )}
          {location.status === "requesting" && (
            <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Locating…
            </span>
          )}
          {location.status === "granted" && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#E1F5EE] px-2.5 py-0.5 text-[11px] font-medium text-[#0F6E56]">
              <Check className="size-3" />
              {location.display}
            </span>
          )}
          {location.status === "denied" && (
            <button
              type="button"
              onClick={requestLocation}
              className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-destructive"
              title={location.message}
            >
              <AlertCircle className="size-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>

      {/* ── ESSENTIALS ────────────────────────────────────────────────────────── */}
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        Essentials
      </p>

      {/* Health Card */}
      <div
        className={cn(
          "mb-2.5 overflow-hidden rounded-xl border transition-all",
          hc.done
            ? "border-[#0F6E56]"
            : hc.open
              ? "border-primary shadow-[0_2px_16px_rgba(24,95,165,0.08)]"
              : "border-[rgba(24,95,165,0.12)]",
        )}
      >
        <button
          type="button"
          onClick={() => toggleCard("hc")}
          className="flex w-full cursor-pointer select-none items-center gap-3.5 px-4 py-4 text-left"
        >
          <CardIcon emoji="🪪" done={hc.done} active={hc.open} />
          <div className="flex-1">
            <p className="text-[15px] font-medium text-[#0E1420]">Health Card</p>
            <p className="mt-0.5 text-[12px] leading-[1.4] text-muted-foreground">
              Helps us confirm your provincial coverage (OHIP or equivalent)
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CardStatusBadge done={hc.done} />
            <CardChevron open={hc.open} />
          </div>
        </button>
        {hc.open && (
          <div className="border-t border-[rgba(24,95,165,0.12)] px-4 pb-4">
            <CardRationale>
              Your health card number lets us confirm which provincially-funded services are
              available to you — like family doctor waitlists, specialist referrals, and lab work.
            </CardRationale>
            <UploadZone
              icon="📷"
              title="Upload a photo of your health card"
              subtitle={
                <>
                  Front side only ·{" "}
                  <span className="text-primary">Browse or drag &amp; drop</span>
                </>
              }
              accept="image/*,.pdf,.heic"
              onFiles={(incoming) => {
                setHc((s) => {
                  const names = new Set(s.files.map((f) => f.name));
                  const next = [...s.files, ...incoming.filter((f) => !names.has(f.name))];
                  return { ...s, files: next, done: next.length > 0 };
                });
              }}
              disabled={hc.uploading}
            />
            <FilePreviews
              files={hc.files}
              onRemove={(i) =>
                setHc((s) => {
                  const next = s.files.filter((_, idx) => idx !== i);
                  return { ...s, files: next, done: next.length > 0 };
                })
              }
            />
            <SkipLink onSkip={() => skipCard("hc")} />
          </div>
        )}
      </div>

      {/* Benefits Booklet */}
      <div
        className={cn(
          "mb-2.5 overflow-hidden rounded-xl border transition-all",
          benefits.done
            ? "border-[#0F6E56]"
            : benefits.open
              ? "border-primary shadow-[0_2px_16px_rgba(24,95,165,0.08)]"
              : "border-[rgba(24,95,165,0.12)]",
        )}
      >
        <button
          type="button"
          onClick={() => toggleCard("benefits")}
          className="flex w-full cursor-pointer select-none items-center gap-3.5 px-4 py-4 text-left"
        >
          <CardIcon emoji="📋" done={benefits.done} active={benefits.open} />
          <div className="flex-1">
            <p className="text-[15px] font-medium text-[#0E1420]">Benefits Booklet</p>
            <p className="mt-0.5 text-[12px] leading-[1.4] text-muted-foreground">
              Upload your employer benefits summary to unlock coverage details
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CardStatusBadge done={benefits.done} />
            <CardChevron open={benefits.open} />
          </div>
        </button>
        {benefits.open && (
          <div className="border-t border-[rgba(24,95,165,0.12)] px-4 pb-4">
            <CardRationale>
              We use this to tell you exactly what&apos;s covered under your plan — physiotherapy
              limits, mental health sessions, specialist co-pays — before we recommend a provider.
            </CardRationale>
            <UploadZone
              icon="📄"
              title="Upload your benefits booklet or summary"
              subtitle={
                <>
                  PDF or image ·{" "}
                  <span className="text-primary">Browse or drag &amp; drop</span>
                </>
              }
              accept="image/*,.pdf,.doc,.docx"
              onFiles={(incoming) => {
                setBenefits((s) => {
                  const names = new Set(s.files.map((f) => f.name));
                  const next = [...s.files, ...incoming.filter((f) => !names.has(f.name))];
                  return { ...s, files: next, done: next.length > 0 };
                });
              }}
              disabled={benefits.uploading}
            />
            <FilePreviews
              files={benefits.files}
              onRemove={(i) =>
                setBenefits((s) => {
                  const next = s.files.filter((_, idx) => idx !== i);
                  return { ...s, files: next, done: next.length > 0 };
                })
              }
            />
            <SkipLink onSkip={() => skipCard("benefits")} />
          </div>
        )}
      </div>

      {/* EAP Details */}
      <div
        className={cn(
          "mb-2.5 overflow-hidden rounded-xl border transition-all",
          eap.done
            ? "border-[#0F6E56]"
            : eap.open
              ? "border-primary shadow-[0_2px_16px_rgba(24,95,165,0.08)]"
              : "border-[rgba(24,95,165,0.12)]",
        )}
      >
        <button
          type="button"
          onClick={() => toggleCard("eap")}
          className="flex w-full cursor-pointer select-none items-center gap-3.5 px-4 py-4 text-left"
        >
          <CardIcon emoji="🧠" done={eap.done} active={eap.open} />
          <div className="flex-1">
            <p className="text-[15px] font-medium text-[#0E1420]">EAP Details</p>
            <p className="mt-0.5 text-[12px] leading-[1.4] text-muted-foreground">
              Employee Assistance Program — free mental health and support sessions
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CardStatusBadge done={eap.done} />
            <CardChevron open={eap.open} />
          </div>
        </button>
        {eap.open && (
          <div className="border-t border-[rgba(24,95,165,0.12)] px-4 pb-4">
            <CardRationale>
              Many employers offer 6–8 free counselling or support sessions through an EAP. If yours
              does, we&apos;ll factor this in — it&apos;s often the fastest, lowest-barrier option for
              mental health support.
            </CardRationale>
            <CardInput
              label="EAP provider name (e.g. LifeWorks, Morneau Shepell, Homewood)"
              value={eap.provider}
              onChange={(v) =>
                setEap((s) => ({
                  ...s,
                  provider: v,
                  done: !!(v.trim() || s.accessCode.trim() || s.files.length > 0),
                }))
              }
              placeholder="Type your EAP provider…"
            />
            <CardInput
              label="EAP access code or plan number (if known)"
              value={eap.accessCode}
              onChange={(v) =>
                setEap((s) => ({
                  ...s,
                  accessCode: v,
                  done: !!(s.provider.trim() || v.trim() || s.files.length > 0),
                }))
              }
              placeholder="Optional"
            />
            <UploadZone
              icon="📎"
              title="Or upload your EAP card / welcome letter"
              subtitle={<span className="text-primary">Browse or drag &amp; drop</span>}
              accept="image/*,.pdf,.doc,.docx"
              onFiles={(incoming) => {
                setEap((s) => {
                  const names = new Set(s.files.map((f) => f.name));
                  const next = [...s.files, ...incoming.filter((f) => !names.has(f.name))];
                  return {
                    ...s,
                    files: next,
                    done: !!(s.provider.trim() || s.accessCode.trim() || next.length > 0),
                  };
                });
              }}
              disabled={eap.uploading}
            />
            <FilePreviews
              files={eap.files}
              onRemove={(i) =>
                setEap((s) => {
                  const next = s.files.filter((_, idx) => idx !== i);
                  return {
                    ...s,
                    files: next,
                    done: !!(s.provider.trim() || s.accessCode.trim() || next.length > 0),
                  };
                })
              }
            />
            <SkipLink onSkip={() => skipCard("eap")} />
          </div>
        )}
      </div>

      {/* ── OPTIONAL ENRICHMENT ───────────────────────────────────────────────── */}
      <p className="mb-2 mt-9 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        Optional enrichment
      </p>
      <p className="mb-4 text-[13px] font-light leading-[1.6] text-muted-foreground">
        These connections give AskLuke more context about your health — leading to more precise
        recommendations. All optional, all private.
      </p>

      {/* Wearable Integration */}
      <div
        className={cn(
          "mb-2.5 overflow-hidden rounded-xl border transition-all",
          wearable.done
            ? "border-[#0F6E56]"
            : wearable.open
              ? "border-primary shadow-[0_2px_16px_rgba(24,95,165,0.08)]"
              : "border-[rgba(24,95,165,0.12)]",
        )}
      >
        <button
          type="button"
          onClick={() => toggleCard("wearable")}
          className="flex w-full cursor-pointer select-none items-center gap-3.5 px-4 py-4 text-left"
        >
          <CardIcon emoji="⌚" done={wearable.done} active={wearable.open} />
          <div className="flex-1">
            <p className="text-[15px] font-medium text-[#0E1420]">Wearable Integration</p>
            <p className="mt-0.5 text-[12px] leading-[1.4] text-muted-foreground">
              Connect Apple Health, Google Fit, or Garmin
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CardStatusBadge done={wearable.done} />
            <CardChevron open={wearable.open} />
          </div>
        </button>
        {wearable.open && (
          <div className="border-t border-[rgba(24,95,165,0.12)] px-4 pb-4">
            <CardRationale>
              Activity levels, sleep, and heart rate trends can help surface patterns you might not
              have noticed — like a drop in steps that correlates with when your symptoms started.
            </CardRationale>
            <ConnectBtn
              label="🍎  Connect Apple Health"
              connected={wearable.connected.has("apple")}
              onClick={() =>
                setWearable((s) => {
                  const next = new Set(s.connected);
                  next.has("apple") ? next.delete("apple") : next.add("apple");
                  return { ...s, connected: next, done: next.size > 0 };
                })
              }
            />
            <ConnectBtn
              label="🟢  Connect Google Fit"
              connected={wearable.connected.has("google")}
              onClick={() =>
                setWearable((s) => {
                  const next = new Set(s.connected);
                  next.has("google") ? next.delete("google") : next.add("google");
                  return { ...s, connected: next, done: next.size > 0 };
                })
              }
            />
            <ConnectBtn
              label="⌚  Connect Garmin"
              connected={wearable.connected.has("garmin")}
              onClick={() =>
                setWearable((s) => {
                  const next = new Set(s.connected);
                  next.has("garmin") ? next.delete("garmin") : next.add("garmin");
                  return { ...s, connected: next, done: next.size > 0 };
                })
              }
            />
            <SkipLink onSkip={() => skipCard("wearable")} />
          </div>
        )}
      </div>

      {/* Health Profile Assessment */}
      <div
        className={cn(
          "mb-2.5 overflow-hidden rounded-xl border transition-all",
          profile.done
            ? "border-[#0F6E56]"
            : profile.open
              ? "border-primary shadow-[0_2px_16px_rgba(24,95,165,0.08)]"
              : "border-[rgba(24,95,165,0.12)]",
        )}
      >
        <button
          type="button"
          onClick={() => toggleCard("profile")}
          className="flex w-full cursor-pointer select-none items-center gap-3.5 px-4 py-4 text-left"
        >
          <CardIcon emoji="📊" done={profile.done} active={profile.open} />
          <div className="flex-1">
            <p className="text-[15px] font-medium text-[#0E1420]">Health Profile Assessment</p>
            <p className="mt-0.5 text-[12px] leading-[1.4] text-muted-foreground">
              A few quick questions about your overall health history
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CardStatusBadge done={profile.done} />
            <CardChevron open={profile.open} />
          </div>
        </button>
        {profile.open && (
          <div className="border-t border-[rgba(24,95,165,0.12)] px-4 pb-4">
            <CardRationale>
              Knowing about existing conditions, medications, or allergies helps us flag any care
              pathways that may interact with your current health.
            </CardRationale>
            <CardInput
              label="Any existing conditions? (e.g. diabetes, hypertension)"
              value={profile.conditions}
              onChange={(v) =>
                setProfile((s) => ({
                  ...s,
                  conditions: v,
                  done: !!(v.trim() || s.medications.trim() || s.allergies.trim()),
                }))
              }
              placeholder="Type or leave blank"
            />
            <CardInput
              label="Current medications"
              value={profile.medications}
              onChange={(v) =>
                setProfile((s) => ({
                  ...s,
                  medications: v,
                  done: !!(s.conditions.trim() || v.trim() || s.allergies.trim()),
                }))
              }
              placeholder="Type or leave blank"
            />
            <CardInput
              label="Known allergies"
              value={profile.allergies}
              onChange={(v) =>
                setProfile((s) => ({
                  ...s,
                  allergies: v,
                  done: !!(s.conditions.trim() || s.medications.trim() || v.trim()),
                }))
              }
              placeholder="Type or leave blank"
            />
            <SkipLink onSkip={() => skipCard("profile")} />
          </div>
        )}
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <div className="mt-8 border-t border-[rgba(24,95,165,0.12)] pt-8">
        {submitError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-[13px] text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {submitError}
          </div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_3px_14px_rgba(24,95,165,0.22)] transition-all hover:bg-[#0e4a87] hover:-translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Generate my recommendation
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={submitting}
          className="mt-3.5 block w-full text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Skip all and generate anyway →
        </button>
      </div>
    </div>
  );
}
