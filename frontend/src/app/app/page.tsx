import { currentUser } from "@clerk/nextjs/server";
import { FirstHxIntakeScreen } from "@/components/intake/firsthx-intake-screen";

export default async function AppPage() {
  const user = await currentUser();
  const greetingName = user?.firstName ?? "there";

  return <FirstHxIntakeScreen greetingName={greetingName} />;
}
