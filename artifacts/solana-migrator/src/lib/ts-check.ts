export type TsCheckResult = {
  valid: boolean;
  errors: string[];
  js: string;
};

let tsCache: typeof import("typescript") | null = null;

async function loadTs() {
  if (!tsCache) {
    tsCache = await import("typescript");
  }
  return tsCache;
}

export async function checkTypeScript(code: string): Promise<TsCheckResult> {
  const ts = await loadTs();
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        strict: false,
        jsx: ts.JsxEmit.Preserve,
        noEmit: false,
      },
      reportDiagnostics: true,
    });
    const errors = (result.diagnostics ?? []).map((d) =>
      typeof d.messageText === "string"
        ? d.messageText
        : (d.messageText as { messageText: string }).messageText
    );
    return { valid: errors.length === 0, errors, js: result.outputText };
  } catch (e) {
    return { valid: false, errors: [String(e)], js: "" };
  }
}
