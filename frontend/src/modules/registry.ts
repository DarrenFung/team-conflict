import type { AnyIntakeModule } from "./types";
import { firstHxModule } from "./firsthx";
import { documentUploadModule } from "./document-upload";

export const modules: AnyIntakeModule[] = [firstHxModule, documentUploadModule];

export function findModule(name: string): AnyIntakeModule | undefined {
  return modules.find((m) => m.name === name);
}
