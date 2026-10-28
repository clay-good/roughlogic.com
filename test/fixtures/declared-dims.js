// Every dimension declared for a key name, read from the `// dims:`
// annotations in calc-*.js. Shared by the two tests that hold a unit stated
// for a READER -- a field label, a printed output suffix -- against the
// dimension stated for the gates.
//
// This is a reader, not a gate: it answers "what is this key declared as",
// and returns a Set per key because a name may be declared more than one way.
// A caller comparing against a label must skip a key whose Set has more than
// one member; that disagreement belongs to check-dimensions' key-agreement
// rule, and judging it here would report one defect twice.
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function canonicalDim(expr) {
  // Fold to a sorted base^exponent signature so `M L^-1 T^-2` and `M/L/T^2`
  // compare equal. Returns null if unparseable.
  const t = String(expr).replace(/\*/g, " ").trim();
  if (t === "dimensionless") return "1";
  const map = new Map();
  let sign = 1;
  for (const tok of t.split(/(\s+|\/)/)) {
    if (!tok || /^\s+$/.test(tok)) continue;
    if (tok === "/") { sign = -1; continue; }
    const m = tok.match(/^([A-Za-z]+)(?:\^(-?\d+))?$/);
    if (!m) return null;
    map.set(m[1], (map.get(m[1]) || 0) + (m[2] ? parseInt(m[2], 10) : 1) * sign);
    sign = 1;
  }
  const parts = [...map.entries()].filter(([, e]) => e !== 0).sort((a, b) => a[0].localeCompare(b[0]));
  return parts.length ? parts.map(([b, e]) => b + "^" + e).join(" ") : "1";
}

export function declaredDimensions(root = ROOT) {
  const dims = new Map();
  for (const f of readdirSync(root).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const line of readFileSync(resolve(root, f), "utf8").split("\n")) {
      // An annotation may wrap: `// dims: in { ... }` on one line and
      // `//        out: { ... }` on the next. Reading only the `// dims:` line
      // misses every output key in the 216 annotations written that way -- and
      // worse, makes a key declared on BOTH sides look singly-declared, which
      // is the one case callers are supposed to skip.
      const isDims = line.includes("// dims:");
      const isOutContinuation = /^\s*\/\/\s+out:/.test(line);
      if (!isDims && !isOutContinuation) continue;
      const body = isDims ? line.split("// dims:")[1] : line.replace(/^\s*\/\//, "");
      for (const [, k, d] of body.matchAll(/(\w+): ([^,}]+)/g)) {
        if (k === "in" || k === "out") continue;
        const c = canonicalDim(d);
        if (!c) continue;
        if (!dims.has(k)) dims.set(k, new Set());
        dims.get(k).add(c);
      }
    }
  }
  return dims;
}
