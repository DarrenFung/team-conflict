-- Rename Document → Attachment, keeping data. Indexes and FK constraints use
-- model-prefixed names in Prisma, so rename them too so the schema stays in
-- sync with what Prisma expects.

ALTER TABLE "Document" RENAME TO "Attachment";

ALTER INDEX "Document_pkey" RENAME TO "Attachment_pkey";
ALTER INDEX "Document_userId_idx" RENAME TO "Attachment_userId_idx";
ALTER INDEX "Document_encounterId_idx" RENAME TO "Attachment_encounterId_idx";

ALTER TABLE "Attachment" RENAME CONSTRAINT "Document_userId_fkey" TO "Attachment_userId_fkey";
ALTER TABLE "Attachment" RENAME CONSTRAINT "Document_encounterId_fkey" TO "Attachment_encounterId_fkey";
