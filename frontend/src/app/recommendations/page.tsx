import type { Metadata } from "next";
import { mockRecommendationPayload } from "@/lib/mocks/recommendation";
import { AskLukeTopNav } from "@/components/layout/ask-luke-top-nav";
import { JourneyBar } from "@/components/recommendations/journey-bar";
import { RecommendationShell } from "@/components/recommendations/recommendation-shell";
import { RecommendationHeroSection } from "@/components/recommendations/recommendation-hero";
import { ProfileSituationSection } from "@/components/recommendations/profile-situation-section";
import { PrimaryRecommendationSection } from "@/components/recommendations/primary-recommendation-section";
import { KeyInsightsSection } from "@/components/recommendations/key-insights-section";
import { CareAdvocacySection } from "@/components/recommendations/care-advocacy-section";
import { InsuranceEligibilitySection } from "@/components/recommendations/insurance-eligibility-section";
import { CareSummaryCard } from "@/components/recommendations/care-summary-card";
import { MedicalDisclaimer } from "@/components/recommendations/medical-disclaimer";

export const metadata: Metadata = {
  title: "AskLuke — Your Care Plan",
  description:
    "Evidence-based recommendations, key insights, and coverage guidance — tailored to your profile.",
};

export default function RecommendationsPage() {
  const data = mockRecommendationPayload;

  return (
    <div className="relative min-h-svh bg-[#f5f5f5]">
      <AskLukeTopNav />
      <JourneyBar steps={data.journeySteps} />

      <RecommendationShell
        main={
          <>
            <RecommendationHeroSection hero={data.hero} />
            <ProfileSituationSection
              left={data.profileSituation.left}
              right={data.profileSituation.right}
            />
            <PrimaryRecommendationSection recommendation={data.primaryRecommendation} />
            <KeyInsightsSection insights={data.insights} />
            <CareAdvocacySection items={data.advocacy} />
            <InsuranceEligibilitySection insurance={data.insurance} />
            <MedicalDisclaimer />
          </>
        }
        sidebar={<CareSummaryCard summary={data.careSummary} />}
      />
    </div>
  );
}
