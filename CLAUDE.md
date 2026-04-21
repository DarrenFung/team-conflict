@AGENTS.md

# UI Components

Use **shadcn/ui** components extensively. Prefer shadcn primitives over hand-rolling UI from scratch or reaching for other component libraries.

- Initialize (once): `npx shadcn@latest init`
- Add a component: `npx shadcn@latest add <component>` (e.g. `button`, `dialog`, `form`)
- Components live in `src/components/ui/` and are owned by this repo — edit them freely
- Compose from shadcn primitives for feature components; only hand-roll when no shadcn primitive fits
- Style with Tailwind utility classes and the `cn()` helper from `src/lib/utils.ts`
- Check the registry first: https://ui.shadcn.com/docs/components
