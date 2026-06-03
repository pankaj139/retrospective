---
description: "Use when editing retrospective phase flow, phase components, or navigation. Enforce phase-order consistency and minimal-safe phase changes."
applyTo: "src/phases/**/*.tsx,src/components/Stepper.tsx,src/App.tsx"
---
# Frontend Phases Instructions

## When This Applies
- Any change touching phase screens in src/phases.
- Any change to phase order, labels, or routing.
- Any change to next/previous/phase selection behavior.

## Required Consistency Checks
- Keep phase mapping aligned in all touchpoints:
  - src/App.tsx phase switch rendering
  - src/components/Stepper.tsx phase labels/order
  - Related phase component under src/phases/
- If a phase is inserted, removed, or renumbered, update all phase constants and navigation assumptions in the same change.
- Do not change phase sequence semantics unless explicitly requested.

## Editing Rules
- Prefer minimal edits in existing phase components before creating new abstractions.
- Reuse shared UI primitives from src/components/Button.tsx and src/components/Card.tsx.
- Keep existing styling approach (project CSS utility classes in src/App.css and src/index.css).
- Avoid introducing new utility class names unless they are already defined or added intentionally in project CSS.

## State And Data Safety
- If a phase UI change depends on retro state, verify it still works with data from src/context/RetroContext.tsx.
- Preserve storage/rejoin behavior assumptions used in setup/join flow.
- For behavior changes, validate both active-session and no-active-session paths in setup and navigation.

## Validation Before Finalizing
- Run lint: npm run lint
- Run build: npm run build
- Manually verify:
  - Can navigate expected phases without dead ends.
  - Stepper active/completed/playable states still match phase index behavior.
  - Setup to active retro transition still works for join/start paths.
