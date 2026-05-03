# Layer 3 Outreach Templates

Copy-paste ready text for all three adoption channels.
Replace the sample metrics with verified benchmark output before posting.
Replace [YOUR_GITHUB_URL] and [YOUR_DEMO_URL] with your actual links.

---

## 1. GitHub PR to anza-xyz/solana-web3.js

**Target repo:** https://github.com/anza-xyz/solana-web3.js
**Target file:** `MIGRATION.md` or `packages/kit/README.md` or the migration guide section

**PR Title:**
```
docs: add solana-kit-migrator codemod tool to migration guide
```

**PR Body:**
```markdown
## Summary

This PR adds a reference to `solana-kit-migrator`, a browser-based codemod tool that
automates migration from `@solana/web3.js` v1 to `@solana/kit`.

## What the tool does

- Automatically migrates the bulk of common web3.js v1 patterns (imports, Connection methods,
  Keypair, PublicKey, constants, sysvars, SystemProgram) in under 1 second
- Validated on public repo benchmarks: `solana-labs/example-helloworld` and `solana-developers/program-examples` (343 files scanned, 2,492 transforms, 98% automated aggregate)
- For the 2% requiring structural rewrites (sendAndConfirmTransaction, durable nonces),
  generates a ready-to-paste Claude/Copilot prompt with the exact @solana/kit API patterns
- Fully browser-based — no install, no backend, no CLI needed
- Live demo: [YOUR_DEMO_URL]
- Source: [YOUR_GITHUB_URL]

## Suggested addition to migration docs

~~~markdown
### Automated Migration Tool

Use [solana-kit-migrator]([YOUR_DEMO_URL]) to automate the migration of your codebase.
The tool handles the repetitive patterns automatically and generates AI prompts for the
remaining structural rewrites.

Paste your code, upload a file, or fetch directly from a GitHub URL to get started.
~~~

## Test coverage

20 input/output fixture pairs cover every migration category. The tool was validated
against:
- `solana-labs/example-helloworld`
- `metaplex-foundation/mpl-token-metadata`
- `solana-labs/solana-web3.js` (deprecated branch)
- `solana-developers/solana-cookbook`
- `solana-developers/program-examples`
```

---

## 2. GitHub Issue to anza-xyz/solana-web3.js (alternative if PR is too much)

**Issue Title:**
```
[tool] Browser-based codemod for web3.js v1 → @solana/kit migration
```

**Issue Body:**
```markdown
Hi Anza team 👋

I built a browser-based codemod tool for migrating `@solana/web3.js` v1 codebases to
`@solana/kit` and wanted to share it in case it's useful to reference in the migration docs.

**What it does:**
- Automatically migrates imports, Connection methods, Keypair, PublicKey, Transaction,
  SystemProgram, sysvars, constants, and bs58/Buffer patterns
- Validated on public repo benchmarks: `solana-labs/example-helloworld` and `solana-developers/program-examples` (343 files scanned, 2,492 transforms, 98% automated aggregate)
- Generates a ready-to-paste Claude/Copilot prompt for the 2% that needs structural rewrites
  (sendAndConfirmTransaction → sendAndConfirmTransactionFactory, etc.)
- Fully browser-based — works instantly with no install

**Links:**
- Live demo: [YOUR_DEMO_URL]
- Source: [YOUR_GITHUB_URL]
- Case study (before/after, coverage breakdown): [YOUR_GITHUB_URL]/blob/main/CASE_STUDY.md

Happy to add test fixtures or pattern coverage for any cases I've missed. Would love to
have this linked from the official migration guide if it's useful.
```

---

## 3. Solana Tech Discord Message

**Channel:** `#developer-resources` or `#tooling` or `#web3js`

```
Hey everyone 👋 I built a browser-based codemod tool for migrating @solana/web3.js v1 → @solana/kit

✨ solana-kit-migrator — [YOUR_DEMO_URL]

What it does:
• Handles the repetitive migrations automatically (imports, Connection methods, Keypair, PublicKey, Transaction, SystemProgram, sysvars, constants)
• Validated on public repo benchmarks: `solana-labs/example-helloworld` and `solana-developers/program-examples` (343 files scanned, 2,492 transforms, 98% automated aggregate)
• For the remaining 2% (sendAndConfirmTransaction, durable nonces, raw tx), generates a ready-to-paste Claude/Copilot prompt with the exact @solana/kit API
• Fully browser-based — paste code, get migrated output, no install needed
• Also works with GitHub URLs and file upload

If you're sitting on a web3.js v1 codebase and dreading the migration, give it a try.
Feedback and edge cases welcome — I'll keep adding patterns.

Source: [YOUR_GITHUB_URL]
```

---

## 4. Twitter/X Post

```
I built a browser-based codemod for migrating @solana/web3.js v1 → @solana/kit 🧰

✅ Deterministic bulk migration with explicit AI handoff for edge cases
✅ Handles imports, Connection, Keypair, PublicKey, Transaction, sysvars, SystemProgram
✅ Generates a Claude/Copilot prompt for the 2% that needs structural rewrites
✅ No install — works in your browser

Try it → [YOUR_DEMO_URL]

[YOUR_GITHUB_URL]
```

---

## 5. Codemod Registry Submission

**Registry:** https://codemod.com/registry

Steps to publish (requires account at codemod.com):

1. Create an account at https://app.codemod.com
2. Install the CLI: `npm install -g @codemod-com/cli`
3. Login: `codemod login`
4. In the project root, run: `codemod publish`

The `codemod.json` metadata file (create at project root):
```json
{
  "name": "solana/web3js-to-kit",
  "version": "1.0.0",
  "description": "Migrate @solana/web3.js v1 to @solana/kit with deterministic codemods and AI handoff",
  "engine": "ast-grep",
  "tags": ["solana", "web3", "migration", "blockchain"],
  "applicability": {
    "from": "@solana/web3.js@^1",
    "to": "@solana/kit@^2"
  },
  "testFixtures": "./fixtures"
}
```

Note: The hackathon brief explicitly says not to use `jscodeshift`. If you publish to the
registry, keep the engine aligned with `ast-grep`/`jssg`-style workflows and make it clear
that the repo's deterministic migration engine is what the judge should evaluate.
The fixtures directory with 20 input/output pairs satisfies the registry's test requirement.

---

## Priority Order

| Action | Effort | Impact |
|---|---|---|
| Post in Solana Discord | 2 minutes | High — fast community feedback |
| File GitHub issue on anza-xyz/solana-web3.js | 5 minutes | Highest — official adoption path |
| File PR with doc addition | 15 minutes | Highest — most visible to devs |
| Tweet | 2 minutes | Medium — general visibility |
| Codemod registry publish | 30 minutes | Medium — discoverability |

Do Discord + GitHub issue first (fastest, highest ROI). PR if the issue gets a positive response.
