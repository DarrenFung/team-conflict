import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recommendationPayloadSchema } from "@/types/recommendation";
import { RecommendationPage } from "@/components/recommendations/recommendation-page";
import { EmergencyRecommendationPage } from "@/components/recommendations/emergency-recommendation-page";

export const metadata: Metadata = {
  title: "AskLuke — Your Recommendation",
  description:
    "Based on your symptoms, coverage, and location — here's the clearest path to getting better.",
};

export default async function RecommendationRoute({
  params,
  searchParams,
}: {
  params: Promise<{ encounterId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { encounterId } = await params;
  const { token } = await searchParams;

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: {
      userId: true,
      anonymousAccessToken: true,
      recommendationPayload: true,
      encounterType: true,
    },
  });

  if (!encounter) {
    console.error(`[recommendation] Encounter ${encounterId} not found`);
    notFound();
  }

  if (!encounter.recommendationPayload) {
    console.error(`[recommendation] Encounter ${encounterId} has no recommendationPayload`);
    notFound();
  }

  // Authorize: either the logged-in user owns this encounter, or the
  // anonymous access token matches (passed as ?token= query param). Use the
  // read-only resolver since Server Components can't set cookies and an
  // unknown viewer here should flow through the token path, not spawn a
  // fresh guest row.
  const user = await getActiveUser();
  const isOwner = user != null && encounter.userId === user.id;
  const hasValidToken =
    encounter.anonymousAccessToken != null &&
    token === encounter.anonymousAccessToken;

  if (!isOwner && !hasValidToken) {
    console.error(
      `[recommendation] Auth failed for encounter ${encounterId}: isOwner=${isOwner}, hasValidToken=${hasValidToken}, encounterUserId=${encounter.userId}, requestUserId=${user.id}`,
    );
    notFound();
  }

  const parsed = recommendationPayloadSchema.safeParse(
    encounter.recommendationPayload,
  );

  if (!parsed.success) {
    console.error(
      "[recommendation] Payload validation failed:",
      parsed.error.message,
    );
    notFound();
  }

  if (encounter.encounterType === "emerg") {
    return <EmergencyRecommendationPage data={parsed.data} />;
  }

  return <RecommendationPage data={parsed.data} />;
}
