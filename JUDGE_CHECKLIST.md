# Judge Checklist

Use this for the live demo and submission review.

## Opening

- State the problem in one sentence.
- Say this is a migration tool, not a generic chatbot.
- Name the exact migration: `@solana/web3.js` v1 → `@solana/kit`.

## Demo flow

1. Paste a small `@solana/web3.js` snippet.
2. Show the automatic rewrite.
3. Point out what was handled deterministically.
4. Point out what was flagged for AI.
5. Open the fixture/test story.
6. Show the case study and migration notes.

## What to emphasize

- zero false positives matters more than flashy output
- the tool automates repetitive rewrites
- AI only handles semantic shape changes
- the repo runs locally and independently
- the browser UI makes review easy

## What not to oversell

- Do not claim everything is fully automatic.
- Do not claim the tool replaces human review.
- Do not hide structural rewrites behind generic AI copy.

## Evidence to show

- `pnpm run typecheck`
- `pnpm --filter @workspace/solana-migrator run build`
- fixture directory coverage
- before/after examples
- AI-required annotations on the hard patterns

## Best closing line

- “The goal is not just to migrate code once. The goal is to make the migration path repeatable, safe, and boring.”

