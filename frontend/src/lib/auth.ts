import "server-only";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// HttpOnly cookie that pins a browser to a specific guest `User.id`. 30 days
// is long enough to bridge typical sign-up latency without leaving dead guest
// rows around forever.
const GUEST_COOKIE = "guestUserId";
const GUEST_TTL_SECONDS = 30 * 24 * 60 * 60;

export type ActiveUser = { id: string; isGuest: boolean };

// Returns the current user for a request — either the Clerk-authed user
// (upserted if missing) or a guest keyed by an HttpOnly cookie. Use this
// instead of Clerk's `currentUser()` whenever the call site needs to write
// encounters/attachments.
export async function getOrCreateActiveUser(): Promise<ActiveUser> {
  const { userId: clerkId } = await auth();

  if (clerkId) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;

    // Look up by clerkId first. If nothing matches but an email-matched row
    // exists (e.g. a previous session that never reached /app to run the
    // claim, or a legacy orphan), link it instead of trying to create — the
    // unique constraint on email would otherwise blow up the upsert.
    const byClerkId = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, email: true },
    });
    if (byClerkId) {
      if (email && byClerkId.email !== email) {
        await prisma.user.update({ where: { id: byClerkId.id }, data: { email } });
      }
      return { id: byClerkId.id, isGuest: false };
    }

    if (email) {
      const byEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (byEmail) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { clerkId } });
        return { id: byEmail.id, isGuest: false };
      }
    }

    const created = await prisma.user.create({
      data: { clerkId, email },
      select: { id: true },
    });
    return { id: created.id, isGuest: false };
  }

  const jar = await cookies();
  const existingId = jar.get(GUEST_COOKIE)?.value;
  if (existingId) {
    const existing = await prisma.user.findUnique({
      where: { id: existingId },
      select: { id: true, clerkId: true },
    });
    if (existing && existing.clerkId === null) {
      return { id: existing.id, isGuest: true };
    }
  }

  const fresh = await prisma.user.create({ data: {}, select: { id: true } });
  jar.set(GUEST_COOKIE, fresh.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GUEST_TTL_SECONDS,
    path: "/",
  });
  return { id: fresh.id, isGuest: true };
}
