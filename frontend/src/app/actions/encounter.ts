"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function createEncounter(): Promise<{ id: string }> {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Clerk user has no primary email");

  // Ensure a User row exists for the FK. Clerk is the source of truth for
  // identity; we mirror just enough to key relations.
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email },
    update: { email },
  });

  const encounter = await prisma.encounter.create({
    data: { userId: user.id },
  });
  return { id: encounter.id };
}
