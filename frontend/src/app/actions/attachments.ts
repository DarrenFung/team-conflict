"use server";

import { prisma } from "@/lib/db";
import { getOrCreateActiveUser } from "@/lib/auth";

export async function recordAttachment(input: {
  encounterId: string | null;
  url: string;
  pathname: string;
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
      url: input.url,
      pathname: input.pathname,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      description: input.description,
    },
    select: { id: true },
  });
  return attachment;
}
