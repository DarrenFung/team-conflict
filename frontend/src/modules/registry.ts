import type { AnyIntakeModule } from "./types";
import { attachmentUploadModule } from "./attachment-upload";

export const modules: AnyIntakeModule[] = [attachmentUploadModule];

export function findModule(name: string): AnyIntakeModule | undefined {
  return modules.find((m) => m.name === name);
}
