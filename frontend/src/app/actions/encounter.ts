"use server";

import { prisma } from "@/lib/db";
import { getOrCreateActiveUser } from "@/lib/auth";

export async function createEncounter(): Promise<{ id: string }> {
  const user = await getOrCreateActiveUser();
  const encounter = await prisma.encounter.create({
    data: { userId: user.id },
    select: { id: true },
  });
  return { id: encounter.id };
}
