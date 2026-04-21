import "server-only";
import { tool } from "ai";
import { z } from "zod";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

interface PlaceResult {
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number;
  phone: string | null;
  website: string | null;
  openNow: boolean | null;
  drivingDistanceKm: number | null;
  drivingMinutes: number | null;
}

async function searchNearbyPlaces(
  query: string,
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<PlaceResult[]> {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: radiusKm * 1000,
          },
        },
        maxResultCount: 10,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Places API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  // biome-ignore lint/suspicious/noExplicitAny: Google Places API response
  const places: any[] = data.places ?? [];
  if (places.length === 0) return [];

  // Driving distances for all results in one call
  const destinations = places
    .map((p) => `${p.location.latitude},${p.location.longitude}`)
    .join("|");

  const dmRes = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lon}&destinations=${encodeURIComponent(destinations)}&mode=driving&key=${API_KEY}`,
  );

  // biome-ignore lint/suspicious/noExplicitAny: Google Distance Matrix API response
  let drivingData: any[] = [];
  if (dmRes.ok) {
    const dm = await dmRes.json();
    drivingData = dm.rows?.[0]?.elements ?? [];
  }

  return places.map((p, i) => {
    const driving = drivingData[i];
    return {
      name: p.displayName?.text ?? "Unknown",
      address: p.formattedAddress ?? "",
      rating: p.rating ?? null,
      totalRatings: p.userRatingCount ?? 0,
      phone: p.nationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      openNow: p.currentOpeningHours?.openNow ?? null,
      drivingDistanceKm:
        driving?.status === "OK"
          ? Math.round((driving.distance.value / 1000) * 10) / 10
          : null,
      drivingMinutes:
        driving?.status === "OK"
          ? Math.round(driving.duration.value / 60)
          : null,
    };
  });
}

export const mapsTool = tool({
  description:
    "Search for healthcare providers or pharmacies near the patient's location using Google Maps. Returns top results with ratings, driving distance, and ETA. Use for finding nearby pharmacies, walk-in clinics, physiotherapists, chiropractors, and other healthcare facilities.",
  inputSchema: z.object({
    query: z.string().describe(
      'Type of provider to search for, e.g. "pharmacy", "walk-in clinic", "physiotherapist"',
    ),
    latitude: z.number().describe("Patient latitude"),
    longitude: z.number().describe("Patient longitude"),
    radius_km: z
      .number()
      .optional()
      .default(15)
      .describe("Search radius in km (default 15)"),
  }),
  execute: async ({ query, latitude, longitude, radius_km }) => {
    return await searchNearbyPlaces(query, latitude, longitude, radius_km);
  },
});
