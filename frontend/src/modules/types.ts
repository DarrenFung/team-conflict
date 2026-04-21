import type { ComponentType } from "react";
import type { z } from "zod";

export type ModuleComponentProps<TArgs, TResult> = {
  args: TArgs;
  onComplete: (result: TResult) => void;
  // Null only in edge cases where the chat renders before encounter creation
  // resolves. Most modules don't need this and can ignore it.
  encounterId: string | null;
};

export type IntakeModule<TArgs, TResult> = {
  name: string;
  description: string;
  argsSchema: z.ZodType<TArgs>;
  resultSchema: z.ZodType<TResult>;
  Component: ComponentType<ModuleComponentProps<TArgs, TResult>>;
  formatResultForLLM: (result: TResult) => string;
};

// biome-ignore lint/suspicious/noExplicitAny: registry holds modules with heterogeneous arg/result types
export type AnyIntakeModule = IntakeModule<any, any>;
