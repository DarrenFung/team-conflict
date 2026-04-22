import type { Metadata } from "next";
import { mockRecommendationPayload } from "@/lib/mocks/recommendation";

export const metadata: Metadata = {
  title: "AskLuke — Your Recommendation",
  description:
    "Based on your symptoms, coverage, and location — here's the clearest path to getting better.",
};

export default function RecommendationsPage() {
  // TODO: Replace mock data with actual recommendation payload from the encounter
  const data = mockRecommendationPayload;

  return (
    <div className="relative min-h-svh bg-[#F7F9FC]">
      {/* Recommendation page components will be built to consume the new RecommendationPayload shape */}
      <pre className="max-w-4xl mx-auto p-8 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
