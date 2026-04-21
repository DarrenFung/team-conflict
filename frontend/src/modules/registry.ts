import type { AnyIntakeModule } from "./types";
import { firstHxModule } from "./firsthx";

export const modules: AnyIntakeModule[] = [firstHxModule];

export function findModule(name: string): AnyIntakeModule | undefined {
  return modules.find((m) => m.name === name);
}
