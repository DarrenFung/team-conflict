import { currentUser } from "@clerk/nextjs/server";
import { AiIntakeScreen } from "@/components/intake/ai-intake-screen";
import { FirstHxStandaloneScreen } from "@/modules/firsthx";
import { claimGuestIfPresent } from "@/app/actions/claim";

type IntakeProvider = "ai-sdk" | "firsthx";

function resolveProvider(override: string | undefined): IntakeProvider {
  if (override === "ai-sdk" || override === "firsthx") return override;
  return process.env.INTAKE_PROVIDER === "firsthx" ? "firsthx" : "ai-sdk";
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ intake?: string; reason?: string }>;
}) {
  // If the user just signed up/in after a guest session, attach their guest
  // encounters and attachments to the Clerk account before rendering.
  await claimGuestIfPresent();

  const user = await currentUser();
  const greetingName = user?.firstName ?? "there";
  const { intake, reason } = await searchParams;
  const provider = resolveProvider(intake);
  const initialReason = reason ? decodeURIComponent(reason) : undefined;

  if (provider === "firsthx") {
    return <FirstHxStandaloneScreen greetingName={greetingName} />;
  }

  return <AiIntakeScreen greetingName={greetingName} initialReason={initialReason} />;
}
