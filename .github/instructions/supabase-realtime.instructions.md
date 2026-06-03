---
description: "Use when editing Supabase client, realtime subscriptions, or data loading/writes. Enforce safe env handling and state-sync consistency."
applyTo: "src/context/RetroContext.tsx,src/utils/supabaseClient.ts,vite.config.ts,.env.example,src/phases/**/*.tsx"
---
# Supabase Realtime Instructions

## When This Applies
- Any change to Supabase initialization or environment variables.
- Any change to session/team/member/card/action reads/writes.
- Any change to realtime channel subscriptions or handlers.
- Any phase UI change that depends on Supabase-backed state.

## Required Safety Rules
- Never hardcode secret keys in source files.
- Only use public anon key in frontend runtime; keep service role keys out of client code.
- Preserve warning behavior when required env values are missing.
- Keep [.env.example](.env.example) aligned with required client env variables.

## Data And Sync Consistency
- For each schema write path modified in [src/context/RetroContext.tsx](src/context/RetroContext.tsx), verify corresponding in-memory state updates still occur through loader logic and/or realtime handlers.
- If you change table columns or payload shape mapping, update all affected mapping code in [src/context/RetroContext.tsx](src/context/RetroContext.tsx).
- Do not break fallback behavior that switches to mock data when Supabase fetches fail.
- Keep join/start/leave/cancel flows coherent across active and inactive session paths.

## Realtime Editing Rules
- Keep channel subscriptions scoped and cleaned up in effect cleanup.
- Avoid duplicate insert handling: guard against adding the same entity twice when realtime and local state updates can race.
- If adding new realtime listeners, include update and delete handling where relevant.

## Local Dev And Proxy Rules
- If changing local proxy behavior, keep [vite.config.ts](vite.config.ts) and [src/utils/supabaseClient.ts](src/utils/supabaseClient.ts) compatible.
- Any change to proxy pathing must still support localhost development without editing app code per environment.

## Validation Before Finalizing
- Run lint: npm run lint
- Run build: npm run build
- Manually verify:
  - Team and members load correctly.
  - Starting and joining an active retro still work.
  - Realtime updates appear across tabs/clients for key entities.
  - Missing env vars show expected warning/fallback behavior.
