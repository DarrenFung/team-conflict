"use server";

import { randomBytes } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrCreateActiveUser } from "@/lib/auth";

export async function isRecommendationReady(encounterId: string): Promise<boolean> {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { recommendationPayload: true },
  });
  return encounter?.recommendationPayload != null;
}

export async function createEncounter(): Promise<{ id: string; anonymousAccessToken: string }> {
  const { userId: clerkUserId } = await auth();

  // Always generate an anonymous access token — it serves as a fallback auth
  // mechanism for the recommendation page in case Clerk session state is
  // unavailable during the server-component render.
  const anonymousAccessToken = randomBytes(32).toString("hex");

  if (!clerkUserId) {
    const encounter = await prisma.encounter.create({
      data: { userId: null, anonymousAccessToken },
      select: { id: true, anonymousAccessToken: true },
    });
    return {
      id: encounter.id,
      anonymousAccessToken: encounter.anonymousAccessToken!,
    };
  }

  const user = await getOrCreateActiveUser();
  const encounter = await prisma.encounter.create({
    data: { userId: user.id, anonymousAccessToken },
    select: { id: true, anonymousAccessToken: true },
  });
  return {
    id: encounter.id,
    anonymousAccessToken: encounter.anonymousAccessToken!,
  };
}
