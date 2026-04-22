import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/app",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Guests hit these too — the routes handle their own user resolution via
  // getOrCreateActiveUser (Clerk-authed users or cookie-backed guests).
  "/api/chat",
  "/api/intake/patient-review",
  "/api/attachments/upload",
  // The recommendation page handles its own auth via owner check + anonymous
  // access token, so Clerk middleware should not gate it.
  "/recommendations(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets, unless in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
