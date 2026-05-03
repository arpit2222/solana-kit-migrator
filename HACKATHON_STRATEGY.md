# Boring AI Strategy

## Goal

Win by being the clearest answer to a painful, real migration problem:

- `@solana/web3.js` v1 is deprecated
- `@solana/kit` is the future
- teams still need a safe path between the two

The project should be framed as migration infrastructure, not a generic AI coding assistant.

## What the public hackathon brief rewards

The public criteria emphasize:

- accuracy with zero incorrect changes
- broad coverage of the target migration
- reliability on real repositories
- automation of 80%+ of the migration
- a clear AI handoff for edge cases

That means the best submission is not the one that sounds most magical.
It is the one that produces the fewest surprises.

## Public competitor landscape

I could verify the public event brief, Solana’s migration docs, and the official compatibility layer. I could not reliably enumerate every individual DoraHacks submission from the public page through the available sources, so this strategy focuses on the visible alternatives that a judge or maintainer would compare against.

### 1. Official compatibility path: `@solana/web3-compat`

What it does:

- keeps legacy imports and APIs intact
- lets teams migrate incrementally
- bridges `@solana/web3.js` to Kit under the hood

Strength:

- lowest-friction path for teams that cannot rewrite immediately

Weakness:

- it does not remove legacy surface area
- it does not produce a fully migrated codebase
- it solves adoption, not cleanup

How this repo should compare:

- our output is native `@solana/kit` code
- we automate the actual rewrite
- we explain when a structural rewrite needs AI instead of hiding it

### 2. Manual migration using docs and Q&A

What it looks like:

- read Solana docs
- search StackExchange for each API shape
- rewrite file by file

Strength:

- high judgment quality when a senior engineer does it carefully

Weakness:

- slow
- repetitive
- easy to miss edge cases
- not scalable across real codebases

Observed pain points from public Solana Q&A:

- converting legacy instruction types to Kit types
- wallet adapter compatibility
- transaction construction changes
- confusion around `Connection` vs `createSolanaRpc`

How this repo should compare:

- deterministic transforms handle the repetitive work
- AI prompt generation handles the semantic rewrites
- the repo should feel like a migration accelerator, not a documentation browser

### 3. Generic codemod frameworks

What they do:

- provide syntax-aware rewrite primitives
- support many languages and use cases

Strength:

- broad and reusable

Weakness:

- not migration-specific
- easy to overfit or under-specify
- often need a lot of hand-authored logic for semantic APIs

How this repo should compare:

- focus on one migration and make it excellent
- ship concrete input/output fixtures
- show real-world coverage, not just framework flexibility

## What to emphasize in the submission

1. The migration target is real and urgent.
2. The tool is deterministic where it should be.
3. AI is used only where the API shape genuinely changes.
4. The browser UX makes it easy to evaluate and demo.
5. Fixture tests and repo-level validation prove it is not toy code.

## What to improve in the repo

- Remove any language that sounds like a vague AI demo.
- Replace it with migration metrics, test fixtures, and exact API mappings.
- Show before/after code on the page.
- Make the AI handoff obvious and bounded.
- Make it easy for judges to understand the difference between automatic and manual work.

## Recommended narrative

“This project is a production-oriented migration tool for `@solana/web3.js` v1 to `@solana/kit`. It automates the bulk of the rewrite, flags the semantic edge cases, and gives teams a repeatable path off the legacy API.”

