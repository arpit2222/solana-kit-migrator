# solana-kit-migrator

`solana-kit-migrator` is a production-oriented codemod for migrating `@solana/web3.js` v1 projects
to `@solana/kit`.

Published package:

- `@arpit2222/solana-web3js-to-kit`

## What it does

- Rewrites common imports and API calls from `@solana/web3.js` to `@solana/kit`
- Handles connection, keypair, public key, transaction, buffer, lamport, and sysvar migrations
- Marks structural edge cases for explicit AI follow-up instead of guessing
- Includes tests and real-repo validation notes

## Usage

```bash
npx @codemod/cli run @arpit2222/solana-web3js-to-kit
```

## Example

### Input

```ts
import { Connection, PublicKey, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const payer = Keypair.generate();
const address = new PublicKey("11111111111111111111111111111111");
```

### Output

```ts
import { createSolanaRpc } from "@solana/rpc";
import { generateKeyPairSigner } from "@solana/signers";
import { address } from "@solana/addresses";

const connection = createSolanaRpc("https://api.devnet.solana.com");
const payer = await generateKeyPairSigner();
const derivedAddress = address("11111111111111111111111111111111");
```

## Package notes

- Registry package: `@arpit2222/solana-web3js-to-kit`
- Repository: <https://github.com/arpit2222/solana-kit-migrator>
- License: MIT

## More context

The migration engine is conservative by design:

- deterministic transforms first
- explicit `AI_REQUIRED` markers for structural edge cases
- real-repo validation focus instead of toy examples

See the repository for the judge checklist, requirements audit, and case study:

- <https://github.com/arpit2222/solana-kit-migrator/blob/main/JUDGE_CHECKLIST.md>
- <https://github.com/arpit2222/solana-kit-migrator/blob/main/REQUIREMENTS_AUDIT.md>
- <https://github.com/arpit2222/solana-kit-migrator/blob/main/artifacts/solana-migrator/CASE_STUDY.md>
