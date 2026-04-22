"use server";

import { randomBytes } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrCreateActiveUser } from "@/lib/auth";

export async function createEncounter(): Promise<{ id: string; anonymousAccessToken?: string }> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    const anonymousAccessToken = randomBytes(32).toString("hex");
    const encounter = await prisma.encounter.create({
      data: { userId: null, anonymousAccessToken },
      select: { id: true, anonymousAccessToken: true },
    });
    return {
      id: encounter.id,
      anonymousAccessToken: encounter.anonymousAccessToken ?? undefined,
    };
  }

  const user = await getOrCreateActiveUser();
  const encounter = await prisma.encounter.create({
    data: { userId: user.id },
    select: { id: true },
  });
  return { id: encounter.id };
}
