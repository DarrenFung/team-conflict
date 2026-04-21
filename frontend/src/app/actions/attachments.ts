"use server";

import { randomUUID } from "node:crypto";
import { getAttachmentsBucket, getStorageClient } from "@/lib/gcs";
import { prisma } from "@/lib/db";
import { getOrCreateActiveUser } from "@/lib/auth";

// 15 minutes is plenty for a single-file upload and keeps exposure short if a
// URL leaks.
const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;

export async function getUploadUrl(input: {
  filename: string;
  contentType: string;
}): Promise<{ signedUrl: string; objectPath: string }> {
  const user = await getOrCreateActiveUser();

  // Keep filename for display in the path but scrub anything that could break
  // downstream tooling or escape the prefix.
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `users/${user.id}/${Date.now()}-${randomUUID()}-${safeName}`;

  const file = getStorageClient().bucket(getAttachmentsBucket()).file(objectPath);
  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    contentType: input.contentType,
    expires: Date.now() + UPLOAD_URL_TTL_MS,
  });

  return { signedUrl, objectPath };
}

export async function recordAttachment(input: {
  encounterId: string | null;
  objectPath: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  description: string;
}): Promise<{ id: string }> {
  const user = await getOrCreateActiveUser();

  if (input.encounterId) {
    const encounter = await prisma.encounter.findUnique({
      where: { id: input.encounterId },
      select: { userId: true },
    });
    if (!encounter || encounter.userId !== user.id) {
      throw new Error("Encounter not found");
    }
  }

  const attachment = await prisma.attachment.create({
    data: {
      userId: user.id,
      encounterId: input.encounterId,
      bucket: getAttachmentsBucket(),
      objectPath: input.objectPath,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      description: input.description,
    },
    select: { id: true },
  });
  return attachment;
}
