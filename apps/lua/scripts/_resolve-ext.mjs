// Resolve-Hook: hängt .js an extensionlose relative Imports (qa-dist nutzt extensionsloses ESM).
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) {
    if ((spec.startsWith('./') || spec.startsWith('../')) && !/\.(js|json|mjs|cjs)$/.test(spec)) {
      return next(spec + '.js', ctx);
    }
    throw e;
  }
}
