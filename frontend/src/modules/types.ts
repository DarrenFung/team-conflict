import type { ComponentType, ReactNode } from "react";
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
  // Short human label shown in the chat transcript when the module has
  // finished running (e.g. "Structured symptom questions"). Falls back to
  // `name` if omitted.
  transcriptLabel?: string;
  // Optional rich transcript entry rendered when the module completes —
  // overrides the default chip. Only called during the session (the raw
  // result isn't persisted with the message), so the chip is still the
  // fallback for historical entries.
  renderCompletedSummary?: (result: TResult) => ReactNode;
  argsSchema: z.ZodType<TArgs>;
  resultSchema: z.ZodType<TResult>;
  Component: ComponentType<ModuleComponentProps<TArgs, TResult>>;
  formatResultForLLM: (result: TResult) => string;
};

// biome-ignore lint/suspicious/noExplicitAny: registry holds modules with heterogeneous arg/result types
export type AnyIntakeModule = IntakeModule<any, any>;
