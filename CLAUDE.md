@AGENTS.md

# AI Intake Modules

The `/app` intake lets the LLM (Gemini via Vertex AI) hand off parts of the conversation to specialized UIs via AI SDK tool calls. New capabilities (attachment upload, consent forms, etc.) should be added as **modules**, not as ad-hoc chat logic.

- Each module lives under `src/modules/<name>/` and exports an `IntakeModule<TArgs, TResult>` (see `src/modules/types.ts`) with: `name`, `description`, Zod `argsSchema`/`resultSchema`, a React `Component` (receives `{ args, onComplete }`), and `formatResultForLLM`.
- Register modules in `src/modules/registry.ts` — that's the only wiring needed. `/api/chat/route.ts` auto-generates tools from the registry and enumerates them in the system prompt; `src/components/intake/ai-intake-screen.tsx` dispatches pending tool calls to the matching module's `Component`.
- The `description` is the only steering Gemini gets for tool selection — make it terse and call out anti-patterns (e.g. "Do not call more than once for the same symptom").
- Reference implementation: `src/modules/firsthx/`. See `frontend/README.md` for the full loop and a step-by-step for adding a new module.

# UI Components

Use **shadcn/ui** components extensively. Prefer shadcn primitives over hand-rolling UI from scratch or reaching for other component libraries.

- Initialize (once): `npx shadcn@latest init`
- Add a component: `npx shadcn@latest add <component>` (e.g. `button`, `dialog`, `form`)
- Components live in `src/components/ui/` and are owned by this repo — edit them freely
- Compose from shadcn primitives for feature components; only hand-roll when no shadcn primitive fits
- Style with Tailwind utility classes and the `cn()` helper from `src/lib/utils.ts`
- Check the registry first: https://ui.shadcn.com/docs/components
