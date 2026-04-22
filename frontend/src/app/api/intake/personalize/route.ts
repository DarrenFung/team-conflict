import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export type PersonalizationLocation = {
  lat: number;
  lng: number;
  city?: string;
  province?: string;
  country?: string;
};

export type PersonalizationHealthProfile = {
  conditions?: string;
  medications?: string;
  allergies?: string;
};

export type PersonalizationEap = {
  provider?: string;
  accessCode?: string;
};

export type PersonalizationData = {
  location?: PersonalizationLocation;
  healthProfile?: PersonalizationHealthProfile;
  eap?: PersonalizationEap;
  wearableConnections?: string[];
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { encounterId, anonymousAccessToken, location, healthProfile, eap, wearableConnections } =
      body as {
        encounterId: string;
        anonymousAccessToken?: string;
        location?: PersonalizationLocation;
        healthProfile?: PersonalizationHealthProfile;
        eap?: PersonalizationEap;
        wearableConnections?: string[];
      };

    if (!encounterId) {
      return NextResponse.json({ error: "encounterId is required" }, { status: 400 });
    }

    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { id: true, anonymousAccessToken: true, userId: true },
    });

    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    // Verify access: must match anonymousAccessToken if the encounter uses one
    if (
      encounter.anonymousAccessToken &&
      encounter.anonymousAccessToken !== anonymousAccessToken
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const personalizationData: PersonalizationData = {};
    if (location) personalizationData.location = location;
    if (healthProfile && Object.values(healthProfile).some(Boolean)) {
      personalizationData.healthProfile = healthProfile;
    }
    if (eap && Object.values(eap).some(Boolean)) {
      personalizationData.eap = eap;
    }
    if (wearableConnections && wearableConnections.length > 0) {
      personalizationData.wearableConnections = wearableConnections;
    }

    await prisma.personalizationData.upsert({
      where: { encounterId },
      create: {
        encounterId,
        userId: encounter.userId ?? undefined,
        ...personalizationData,
      },
      update: personalizationData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[personalize] error", err);
    return NextResponse.json({ error: "Failed to save personalization data" }, { status: 500 });
  }
}
