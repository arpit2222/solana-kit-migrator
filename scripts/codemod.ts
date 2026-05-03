import { migrateCode } from "../artifacts/solana-migrator/src/lib/migrator";

export default function transform(root: { root: () => { text: () => string } }) {
  const rootNode = root.root();
  const original = rootNode.text();
  const result = migrateCode(original);

  if (result.transformedCode === original) {
    return null;
  }

  return result.transformedCode;
}
