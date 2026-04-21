import type { AnyIntakeModule } from "./types";
import { firstHxModule } from "./firsthx";
import { attachmentUploadModule } from "./attachment-upload";

export const modules: AnyIntakeModule[] = [firstHxModule, attachmentUploadModule];

export function findModule(name: string): AnyIntakeModule | undefined {
  return modules.find((m) => m.name === name);
}
