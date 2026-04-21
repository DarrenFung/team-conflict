import { currentUser } from "@clerk/nextjs/server";
import { AiIntakeScreen } from "@/components/intake/ai-intake-screen";
import { FirstHxStandaloneScreen } from "@/modules/firsthx";

type IntakeProvider = "ai-sdk" | "firsthx";

function resolveProvider(override: string | undefined): IntakeProvider {
  if (override === "ai-sdk" || override === "firsthx") return override;
  return process.env.INTAKE_PROVIDER === "firsthx" ? "firsthx" : "ai-sdk";
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ intake?: string }>;
}) {
  const user = await currentUser();
  const greetingName = user?.firstName ?? "there";
  const { intake } = await searchParams;
  const provider = resolveProvider(intake);

  if (provider === "firsthx") {
    return <FirstHxStandaloneScreen greetingName={greetingName} />;
  }

  return <AiIntakeScreen greetingName={greetingName} />;
}
