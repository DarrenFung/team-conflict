import { currentUser } from "@clerk/nextjs/server";
import { FirstHxIntakeScreen } from "@/components/intake/firsthx-intake-screen";
import { startIntake, type IntakeState } from "@/lib/firsthx";

export default async function AppPage() {
  const user = await currentUser();
  const greetingName = user?.firstName ?? "there";

  let initialState: IntakeState | null = null;
  let initError: string | null = null;

  try {
    initialState = await startIntake(user?.id ?? crypto.randomUUID());
  } catch (err) {
    initError = err instanceof Error ? err.message : "Failed to start intake session";
  }

  return (
    <FirstHxIntakeScreen
      greetingName={greetingName}
      initialState={initialState}
      initError={initError}
    />
  );
}
