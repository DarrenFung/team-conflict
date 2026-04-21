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
// encounters/documents.
export async function getOrCreateActiveUser(): Promise<ActiveUser> {
  const { userId: clerkId } = await auth();

  if (clerkId) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const user = await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, email },
      update: email ? { email } : {},
      select: { id: true },
    });
    return { id: user.id, isGuest: false };
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
