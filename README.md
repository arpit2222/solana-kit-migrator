# solana-kit-migrator

`solana-kit-migrator` is a standalone codemod workspace for migrating `@solana/web3.js` v1 projects to `@solana/kit`.
The published registry package is `@arpit2222/solana-web3js-to-kit`.

It is built to run locally with `pnpm`, without any platform-specific tooling or Replit dependencies.

## Why this exists

The Boring AI challenge rewards migration infrastructure that is:

- accurate
- deterministic
- reliable on real repos
- able to hand AI the hard edge cases instead of guessing

This repo is built around that model.

## What it does

- Rewrites common `@solana/web3.js` v1 patterns into `@solana/kit` APIs
- Covers imports, connection calls, keypairs, public keys, sysvars, buffers, lamports, and transactions
- Preserves deterministic transforms for the bulk of the migration
- Flags structural rewrites for AI-assisted follow-up
- Ships fixture-based tests so migration behavior stays stable
- Includes a browser playground for review and iteration

## Current positioning

The strongest public alternative is the official `@solana/web3-compat` bridge. That is useful for progressive adoption, but it preserves legacy surface area.

This tool is different:

- it produces migrated code, not just a compatibility shim
- it is designed to automate the migration itself
- it highlights where AI is required instead of pretending every rewrite is mechanical

## Requirements

- Node.js 24+
- `pnpm`

## Quickstart

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

## Run the playground

```bash
pnpm --filter @workspace/solana-migrator run dev
```

## Key docs

- [Hackathon strategy](./HACKATHON_STRATEGY.md)
- [Judge checklist](./JUDGE_CHECKLIST.md)
- [Requirements audit](./REQUIREMENTS_AUDIT.md)
- [Case study](./artifacts/solana-migrator/CASE_STUDY.md)
- [Outreach templates](./artifacts/solana-migrator/OUTREACH.md)

## Verified benchmark

The current judge-ready benchmark is two public clones:

- `solana-labs/example-helloworld`
- `solana-developers/program-examples`

Aggregate result:

- 343 files scanned
- 148 files with `@solana/web3.js` usage
- 2,492 total transforms
- 2,451 automated transforms
- 41 AI-required transforms
- 98% coverage
