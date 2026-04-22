"use server";

import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const GUEST_COOKIE = "guestUserId";

// If a Clerk-authed request arrives with a guest cookie, reparent the guest's
// data onto the Clerk user (or promote the guest row in place if this is the
// first time we've seen that Clerk id). No-op otherwise.
//
// Safe to call on every `/app` visit; the transaction is idempotent once the
// guest row is gone.
export async function claimGuestIfPresent(): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return;

  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value;
  if (!guestId) return;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;

  await prisma.$transaction(async (tx) => {
    const guest = await tx.user.findUnique({
      where: { id: guestId },
      select: { id: true, clerkId: true },
    });
    if (!guest || guest.clerkId !== null) return;

    const existing = await tx.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (existing) {
      // Returning user — reparent guest-owned rows and delete the guest.
      await tx.encounter.updateMany({
        where: { userId: guest.id },
        data: { userId: existing.id },
      });
      await tx.attachment.updateMany({
        where: { userId: guest.id },
        data: { userId: existing.id },
      });
      await tx.user.delete({ where: { id: guest.id } });
    } else {
      // First-time claim — promote the guest row in place.
      await tx.user.update({
        where: { id: guest.id },
        data: { clerkId, email },
      });
    }
  });

  // Server Components can read cookies but can't mutate them. `/app/page.tsx`
  // awaits this during render, so the delete must be best-effort — the stale
  // cookie is harmless since its target row now has a clerkId (or is gone),
  // and both getActiveUser and getOrCreateActiveUser ignore those.
  try {
    jar.delete(GUEST_COOKIE);
  } catch {
    // Called from a non-mutating context; skip cleanup.
  }
}
