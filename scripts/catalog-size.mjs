// One number, shared by every gate that reads tools-data.js with a regex.
//
// Those regexes match a fixed field order -- `{ id: "...", name: "...",
// group: "..."` -- so a tile written with its fields in another order, or a
// name carrying an escape the pattern does not allow, is silently skipped.
// A tile a gate skips is a tile that gate never checked, and a sweep that
// covered 1,700 of 1,804 reports exactly what a sweep that covered all of
// them reports: nothing. Every such parser asserts here that it saw the whole
// registry, against the module's own TOOLS.length -- the only count that
// cannot drift with the file's formatting. tools-data.js is pure data with no
// side effects, so importing it is free of consequence.
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function catalogSize() {
  const mod = await import(pathToFileURL(resolve(ROOT, "tools-data.js")).href);
  return (mod.TOOLS || []).length;
}

// Fails loudly rather than letting a gate quietly narrow its own scope.
export async function assertFullCatalogParse(parsed, who) {
  const live = await catalogSize();
  if (parsed === live) return;
  console.error(
    `${who}: parsed ${parsed} tile(s) out of tools-data.js, but TOOLS holds ${live}. ` +
    `The regex in this script matches a fixed field order; ${live - parsed} tile(s) ` +
    `did not match it and would have gone unchecked. Fix the pattern (or read the ` +
    `module directly) rather than shipping a gate that covers part of the catalog.`
  );
  process.exit(1);
}
