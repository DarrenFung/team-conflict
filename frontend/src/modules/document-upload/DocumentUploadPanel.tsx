"use client";

import { useState } from "react";
import { AlertCircle, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUploadUrl, recordDocument } from "@/app/actions/documents";
import type { ModuleComponentProps } from "../types";
import type { DocumentUploadArgs, DocumentUploadResult } from "./index";

type Props = ModuleComponentProps<DocumentUploadArgs, DocumentUploadResult>;

type UploadedFile = DocumentUploadResult["uploads"][number]["files"][number];

export function DocumentUploadPanel({ args, onComplete, encounterId }: Props) {
  const [slots, setSlots] = useState<Record<string, File[]>>(() =>
    Object.fromEntries(args.documents.map((d) => [d.id, []])),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSlotsFilled = args.documents.every((d) => (slots[d.id] ?? []).length > 0);

  function addFiles(specId: string, list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    setSlots((prev) => {
      const spec = args.documents.find((d) => d.id === specId);
      const current = prev[specId] ?? [];
      const next = spec?.multiple ? [...current, ...incoming] : incoming.slice(0, 1);
      return { ...prev, [specId]: next };
    });
  }

  function removeFile(specId: string, index: number) {
    setSlots((prev) => ({
      ...prev,
      [specId]: (prev[specId] ?? []).filter((_, i) => i !== index),
    }));
  }

  async function uploadOne(file: File, description: string): Promise<UploadedFile> {
    const contentType = file.type || "application/octet-stream";
    const { signedUrl, objectPath } = await getUploadUrl({
      filename: file.name,
      contentType,
    });

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`Upload of "${file.name}" failed (${putRes.status})`);
    }

    const doc = await recordDocument({
      encounterId,
      objectPath,
      originalFilename: file.name,
      contentType,
      sizeBytes: file.size,
      description,
    });

    return {
      documentId: doc.id,
      originalFilename: file.name,
      contentType,
      sizeBytes: file.size,
    };
  }

  async function handleSubmit() {
    setUploading(true);
    setError(null);
    try {
      const uploads: DocumentUploadResult["uploads"] = [];
      for (const spec of args.documents) {
        const files = slots[spec.id] ?? [];
        const uploaded = await Promise.all(
          files.map((f) => uploadOne(f, spec.description)),
        );
        uploads.push({ specId: spec.id, files: uploaded });
      }
      onComplete({ uploads });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-[rgba(24,95,165,0.12)] pt-4">
      {args.documents.map((spec) => {
        const files = slots[spec.id] ?? [];
        return (
          <div
            key={spec.id}
            className="rounded-xl border border-[rgba(24,95,165,0.15)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{spec.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{spec.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#E6F1FB] px-2 py-0.5 text-[10px] font-medium text-primary">
                {spec.multiple ? "Multiple" : "Single"}
              </span>
            </div>

            {files.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-[#F7F9FC] px-2.5 py-1.5 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                      <FileText className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(spec.id, i)}
                      disabled={uploading}
                      aria-label={`Remove ${f.name}`}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <label
              className={cn(
                "mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-[#F7F9FC] px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-[#E6F1FB]",
                uploading && "pointer-events-none opacity-50",
              )}
            >
              {spec.multiple
                ? "Add file(s)"
                : files.length > 0
                  ? "Replace file"
                  : "Choose file"}
              <input
                type="file"
                multiple={spec.multiple}
                disabled={uploading}
                onChange={(e) => {
                  addFiles(spec.id, e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          </div>
        );
      })}

      {error ? (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {uploading ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Uploading…
          </span>
        ) : null}
        <Button type="button" onClick={handleSubmit} disabled={!allSlotsFilled || uploading}>
          Submit
        </Button>
      </div>
    </div>
  );
}
