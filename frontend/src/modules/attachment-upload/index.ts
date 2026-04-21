import { z } from "zod";
import type { IntakeModule } from "../types";
import { AttachmentUploadPanel } from "./AttachmentUploadPanel";

const attachmentSpecSchema = z.object({
  id: z
    .string()
    .describe("Short snake_case identifier for the attachment type, e.g. 'health_card' or 'benefits_pdfs'."),
  label: z
    .string()
    .describe("Human-readable name shown as the slot title, e.g. 'Health card (front)'."),
  description: z
    .string()
    .describe("One-line explanation of what to upload; also stored on the Attachment row."),
  multiple: z
    .boolean()
    .describe("true if the slot should accept multiple files; false for a single file."),
});

const argsSchema = z.object({
  attachments: z
    .array(attachmentSpecSchema)
    .min(1)
    .describe("One entry per attachment type to request. Each renders as its own upload slot."),
});

const uploadedFileSchema = z.object({
  attachmentId: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
});

const resultSchema = z.object({
  uploads: z.array(
    z.object({
      specId: z.string(),
      files: z.array(uploadedFileSchema),
    }),
  ),
});

export type AttachmentUploadArgs = z.infer<typeof argsSchema>;
export type AttachmentUploadResult = z.infer<typeof resultSchema>;

export const attachmentUploadModule: IntakeModule<AttachmentUploadArgs, AttachmentUploadResult> = {
  name: "requestAttachmentUpload",
  description:
    "Ask the patient to upload one or more specific files (e.g. health card photo, benefits PDFs, prior lab results). Pass a list of attachment types — each becomes its own upload slot with a title, description, and single-vs-multiple setting. Use once per logical request; do not call repeatedly for the same attachment.",
  argsSchema,
  resultSchema,
  Component: AttachmentUploadPanel,
  formatResultForLLM: ({ uploads }) => {
    if (uploads.length === 0) return "(no attachments uploaded)";
    return (
      "Attachments uploaded:\n" +
      uploads
        .map((u) => {
          if (u.files.length === 0) return `- ${u.specId}: (none)`;
          const names = u.files.map((f) => f.originalFilename).join(", ");
          const count = u.files.length === 1 ? "1 file" : `${u.files.length} files`;
          return `- ${u.specId}: ${count} (${names})`;
        })
        .join("\n")
    );
  },
};
