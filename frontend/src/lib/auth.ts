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

// Resolve the current user without creating a new guest row. Callable from
// Server Components and other read-only contexts where `cookies().set()`
// is disallowed by Next.js. Returns null for first-time anonymous
// visitors. For the Clerk branch a DB upsert still happens so downstream
// ownership checks work — Server Components are allowed to write to the
// DB, just not cookies.
async function resolveActiveUser(options: {
  createGuest: boolean;
}): Promise<ActiveUser | null> {
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

  if (!options.createGuest) return null;

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

// Returns the current user for a request — either the Clerk-authed user
// (upserted if missing) or a guest keyed by an HttpOnly cookie. Use this
// from Server Actions and Route Handlers where it's OK to mint a new
// guest (which sets a cookie).
export async function getOrCreateActiveUser(): Promise<ActiveUser> {
  const user = await resolveActiveUser({ createGuest: true });
  // createGuest: true always resolves to a user (Clerk, existing guest, or
  // a freshly minted guest). Narrow the type for callers.
  if (!user) throw new Error("Failed to resolve active user");
  return user;
}

// Read-only variant for Server Components / other render-time contexts.
// Returns null if the visitor has no Clerk session and no existing guest
// cookie — call sites should fall back to their own auth path (e.g. an
// anonymous access token).
export async function getActiveUser(): Promise<ActiveUser | null> {
  return resolveActiveUser({ createGuest: false });
}
