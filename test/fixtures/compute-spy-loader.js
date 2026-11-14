// Node module-loader hook for render-silent-flag-sweep.js: before each repo-root
// calc-*.js module's own code runs, rebind every `export function computeX` to a
// wrapper that records its first result since the last reset. A function
// declaration is hoisted and is a mutable binding, so a renderer that calls the
// compute by its local name, and a factory handed `compute: computeX` while the
// module body runs, both get the wrapper. Test-only; nothing
// here touches the shipped modules.
const ROOT = new URL("../../", import.meta.url).href;
// Synchronous for registerHooks; register() (Node 20) awaits whatever it returns,
// and there `next` returns a promise, so both shapes are handled.
export function load(url, context, next) {
  const out = next(url, context);
  if (out && typeof out.then === "function") return out.then((o) => spy(url, o));
  return spy(url, out);
}
function spy(url, out) {
  if (!url.startsWith(ROOT) || !/^calc-[^/]+\.js$/.test(url.slice(ROOT.length))) return out;
  const src = typeof out.source === "string" ? out.source : new TextDecoder().decode(out.source);
  const names = [...src.matchAll(/^export function (compute\w+)\s*\(/gm)].map((m) => m[1]);
  if (!names.length) return out;
  const tail = names.map((n) => `${n} = globalThis.__computeSpy(${n}, ${JSON.stringify(n)});`).join("\n");
  return { ...out, source: tail + "\n" + src, shortCircuit: true };
}
