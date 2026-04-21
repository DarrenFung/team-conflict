# team-conflict

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## UI Components

This project uses [**shadcn/ui**](https://ui.shadcn.com) extensively for UI components. Prefer shadcn primitives over custom-built components or other libraries.

Initialize shadcn (one-time):

```bash
npx shadcn@latest init
```

Add components as needed:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog form input
```

Components are generated into `src/components/ui/` and owned by this repo — edit them freely. Compose feature components from shadcn primitives; only hand-roll UI when no primitive fits. See the [component registry](https://ui.shadcn.com/docs/components) for what's available.

## AI Intake Module Pattern

The `/app` intake uses a pluggable module system so the LLM (Gemini via Vertex AI) can hand off parts of the conversation to specialized UIs — e.g. the firstHx structured symptom capture — then resume with the structured result in context. Each **module** is a self-contained unit that:

- declares a `name` and `description` — surfaced to the LLM as a tool
- has Zod schemas for its input arguments and output result
- renders a React component that drives its own UX and calls `onComplete(result)`
- formats its result as plain text for the LLM to consume on resume

### Files

- `src/modules/types.ts` — the `IntakeModule<TArgs, TResult>` contract
- `src/modules/registry.ts` — the exported list of modules; both `/api/chat` (tool generation) and `ai-intake-screen.tsx` (client dispatch) read from here
- `src/modules/<name>/` — one folder per module (panel component + `index.ts` that exports the module definition)

### How the loop works

1. User sends a message. `/api/chat` streams Gemini with every module in `registry.modules` exposed as an AI SDK tool. The system prompt enumerates them.
2. When Gemini calls a tool, the message stream carries a `tool-<name>` part in `input-available` state.
3. `ChatScreen` (in `ai-intake-screen.tsx`) walks the messages, finds the pending tool call, looks up the module by name via `findModule`, and renders `module.Component` with the tool's `input` as `args`.
4. The component runs its UI. When done, it calls `onComplete(result)`.
5. The client calls `addToolOutput` with the tool call id and `module.formatResultForLLM(result)`. `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` triggers Gemini to resume with the tool result in context.

### Adding a new module

1. Create `src/modules/<your-module>/index.ts`:

   ```ts
   import { z } from "zod";
   import type { IntakeModule } from "../types";
   import { YourPanel } from "./YourPanel";

   const argsSchema = z.object({ /* ... */ });
   const resultSchema = z.object({ /* ... */ });

   export type YourArgs = z.infer<typeof argsSchema>;
   export type YourResult = z.infer<typeof resultSchema>;

   export const yourModule: IntakeModule<YourArgs, YourResult> = {
     name: "yourToolName",             // Gemini sees this as the tool name
     description: "One clear sentence on when to call this.",
     argsSchema,
     resultSchema,
     Component: YourPanel,
     formatResultForLLM: (r) => `...`, // what Gemini reads on resume
   };
   ```

2. Create `src/modules/<your-module>/YourPanel.tsx`. It receives `{ args, onComplete }`. The panel owns its own interaction state and terminates by calling `onComplete(result)` — it does **not** read from or write to chat state directly.

3. Register it in `src/modules/registry.ts`:

   ```ts
   import { yourModule } from "./your-module";
   export const modules: AnyIntakeModule[] = [firstHxModule, yourModule];
   ```

No changes to `/api/chat/route.ts` or `ai-intake-screen.tsx` are required.

### Writing the `description`

Gemini picks tools based on description alone — this is the only steering you get. Write a terse sentence about *when* to call it, and call out anti-patterns (e.g. "Do not call more than once for the same symptom"). See `src/modules/firsthx/index.ts` for a reference.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
