import type { CallableTool, FunctionCall, Part, Tool } from "@google/genai";
import { createPartFromFunctionResponse } from "@google/genai";

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
  radiusKm: number
): Promise<PlaceResult[]> {
  // Places API (New) — Text Search
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
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Places API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const places = data.places ?? [];

  if (places.length === 0) return [];

  // Get driving distances for all results in one call
  const destinations = places
    .map(
      (p: any) =>
        `${p.location.latitude},${p.location.longitude}`
    )
    .join("|");

  const dmRes = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lon}&destinations=${encodeURIComponent(destinations)}&mode=driving&key=${API_KEY}`
  );

  let drivingData: any[] = [];
  if (dmRes.ok) {
    const dm = await dmRes.json();
    drivingData = dm.rows?.[0]?.elements ?? [];
  }

  return places.map((p: any, i: number) => {
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

export function createMapsTool(): CallableTool {
  return {
    async tool(): Promise<Tool> {
      return {
        functionDeclarations: [
          {
            name: "find_nearby_healthcare_provider",
            description:
              "Search for healthcare providers or pharmacies near the caller's location using Google Maps. Returns top results with ratings, reviews, driving distance and ETA. Use this for finding nearby private-pay practitioners (chiropractors, physiotherapists, massage therapists, naturopaths, etc.), pharmacies, walk-in clinics, or any other healthcare facility.",
            parameters: {
              type: "OBJECT",
              properties: {
                query: {
                  type: "STRING",
                  description:
                    'The type of healthcare provider or facility to search for, e.g. "chiropractor", "physiotherapist", "pharmacy", "walk-in clinic", "massage therapist", "naturopath"',
                },
                latitude: {
                  type: "NUMBER",
                  description: "Caller's latitude",
                },
                longitude: {
                  type: "NUMBER",
                  description: "Caller's longitude",
                },
                radius_km: {
                  type: "NUMBER",
                  description:
                    "Search radius in kilometers. Defaults to 15 if not specified.",
                },
              },
              required: ["query", "latitude", "longitude"],
            },
          },
        ],
      };
    },

    async callTool(functionCalls: FunctionCall[]): Promise<Part[]> {
      const parts: Part[] = [];

      for (const call of functionCalls) {
        if (call.name === "find_nearby_healthcare_provider") {
          const args = call.args as Record<string, any>;
          try {
            const results = await searchNearbyPlaces(
              args.query,
              args.latitude,
              args.longitude,
              args.radius_km ?? 15
            );
            parts.push(
              createPartFromFunctionResponse(
                call.id ?? "",
                call.name,
                { results }
              )
            );
          } catch (err: any) {
            parts.push(
              createPartFromFunctionResponse(
                call.id ?? "",
                call.name,
                { error: err.message }
              )
            );
          }
        }
      }

      return parts;
    },
  };
}
