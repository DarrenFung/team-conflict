import type { RecommendationPayload } from "@/types/recommendation";
import { AskLukeTopNav } from "@/components/layout/ask-luke-top-nav";
import { IntakeJourneyBar } from "@/components/intake/intake-journey-shell";
import { HeroSection } from "./hero-section";
import { ProfileCard } from "./profile-card";
import { UrgencyBar } from "./urgency-bar";
import { PrimaryRecommendation } from "./primary-recommendation";
import { KeyInsights } from "./key-insights";
import { CoverageSection } from "./coverage-section";
import { CareResources } from "./care-resources";
import { CareSummaryCard } from "./care-summary-card";
import { BenefitsSnapshotCard } from "./benefits-snapshot-card";
import { SourceArticles } from "./source-articles";
import { MedicalDisclaimer } from "./medical-disclaimer";

export function RecommendationPage({ data }: { data: RecommendationPayload }) {
  return (
    <div className="min-h-svh bg-[#F7F9FC]">
      <AskLukeTopNav />
      <div className="fixed inset-x-0 top-[60px] z-50 border-b border-[rgba(24,95,165,0.12)] bg-white/95 pt-2 backdrop-blur-[10px]">
        <IntakeJourneyBar active="recommendation" />
      </div>

      <div className="mx-auto max-w-[1040px] px-8 pt-[116px] pb-[100px] max-md:px-5 max-md:pt-[116px] max-md:pb-[60px]">
        <div className="lg:grid lg:grid-cols-[1fr_292px]">
          {/* Main column */}
          <div className="min-w-0 lg:pr-[52px]">
            <HeroSection />
            <ProfileCard profile={data.profile} />

            {/* Urgency bar sits between profile and recommendation */}
            <div className="border-b-0 pt-0 pb-6">
              <UrgencyBar urgency={data.urgency} />
            </div>

            <PrimaryRecommendation recommendation={data.recommendation} />
            <KeyInsights insights={data.insights} />
            <CoverageSection coverage={data.coverage} />
            <CareResources resources={data.careResources} />
            {data.sourceArticles && data.sourceArticles.length > 0 && (
              <SourceArticles articles={data.sourceArticles} />
            )}
            <MedicalDisclaimer />
          </div>

          {/* Sidebar — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-[116px] space-y-3">
              <CareSummaryCard summary={data.careSummary} />
              {data.benefitsSnapshot && (
                <BenefitsSnapshotCard snapshot={data.benefitsSnapshot} />
              )}
            </div>
          </aside>

          {/* Sidebar — mobile (below main content) */}
          <div className="mt-5 space-y-3 lg:hidden">
            <CareSummaryCard summary={data.careSummary} />
            {data.benefitsSnapshot && (
              <BenefitsSnapshotCard snapshot={data.benefitsSnapshot} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
