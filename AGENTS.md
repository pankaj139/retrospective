# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project At A Glance
- Stack: React 19 + TypeScript + Vite + Supabase Realtime.
- App purpose: Facilitate multi-phase DAKI retrospectives for teams.
- Primary reference: [README.md](README.md).

## Runbook
- Install: `npm install`
- Dev server: `npm run dev`
- Type-check + production build: `npm run build`
- Lint: `npm run lint`
- Preview built app: `npm run preview`

## Key Architecture
- App shell and phase routing: [src/App.tsx](src/App.tsx)
- Global state + Supabase data/realtime wiring: [src/context/RetroContext.tsx](src/context/RetroContext.tsx)
- Setup and team/member onboarding UX: [src/phases/SetupPhase.tsx](src/phases/SetupPhase.tsx)
- Stepper phase navigation labels and order: [src/components/Stepper.tsx](src/components/Stepper.tsx)
- Shared UI primitives: [src/components/Button.tsx](src/components/Button.tsx), [src/components/Card.tsx](src/components/Card.tsx)
- Supabase client setup: [src/utils/supabaseClient.ts](src/utils/supabaseClient.ts)
- Domain interfaces and fallback/mock data: [src/utils/mockData.ts](src/utils/mockData.ts)
- Styling system and utility classes: [src/index.css](src/index.css), [src/App.css](src/App.css)

## Conventions To Follow
- Use functional React components with TypeScript types.
- Reuse existing shared components before adding new UI primitives.
- Keep domain type updates aligned with interfaces in [src/utils/mockData.ts](src/utils/mockData.ts).
- Keep phase flow consistent across:
  - [src/App.tsx](src/App.tsx) phase switch
  - [src/components/Stepper.tsx](src/components/Stepper.tsx) labels/order
  - Any affected phase component in [src/phases/](src/phases/)
- Preserve localStorage/sessionStorage keys already used by the app (`daki_retro_*`) unless a migration is intentional.

## Supabase And Environment Notes
- Required environment variables are documented in [.env.example](.env.example).
- Local development may use the Vite proxy `/supabase-api`; see [vite.config.ts](vite.config.ts).
- [src/utils/supabaseClient.ts](src/utils/supabaseClient.ts) falls back to placeholder values when env vars are missing; do not treat this as production-safe configuration.
- When changing writes in [src/context/RetroContext.tsx](src/context/RetroContext.tsx), verify corresponding realtime update paths still keep UI state in sync.

## UI/Styling Pitfall
- Tailwind is not installed as a dependency; this project emulates many utility classes in CSS. Before introducing new utility class names, confirm they exist in [src/App.css](src/App.css) or add them there.

## Scope And Safety
- Keep changes minimal and localized.
- Do not refactor unrelated files in the same change.
- If behavior changes, update [README.md](README.md) only when necessary and keep it concise.
