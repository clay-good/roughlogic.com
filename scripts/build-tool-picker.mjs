#!/usr/bin/env node
// Regenerate the homepage tool-picker <option> list from the live TOOLS
// array in app.js. Output is written between
// <!-- TOOL-PICKER:START --> and <!-- TOOL-PICKER:END --> in index.html.
//
// The home view ships every tile title in the served HTML so crawlers see
// the full catalog and the "pick from the full list" <select> renders with
// zero client-side JS. The picker is the catalog index that replaced the
// home tile grid.
//
// Idempotent. Pass --check to fail (exit 1) when the generated block would
// differ from what is already in index.html (used by `npm run lint`).

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INDEX = resolve(ROOT, "index.html");
const CHECK = process.argv.includes("--check");

const appSource = await readFile(resolve(ROOT, "app.js"), "utf8");
const arrMatch = appSource.match(/const TOOLS = \[([\s\S]*?)\n\];/);
if (!arrMatch) {
  console.error("build-tool-picker: could not find TOOLS array in app.js");
  process.exit(1);
}

const body = arrMatch[1];
const tiles = [];
const entryRe = /\{\s*id:\s*"([a-z0-9-]+)"[^}]*?name:\s*"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = entryRe.exec(body)) !== null) {
  tiles.push({ id: m[1], name: m[2] });
}
if (tiles.length === 0) {
  console.error("build-tool-picker: parsed zero tiles from TOOLS - refusing to overwrite.");
  process.exit(1);
}

tiles.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const options = tiles
  .map((t) => `            <option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`)
  .join("\n");

const block = `          <!-- TOOL-PICKER:START -->
${options}
          <!-- TOOL-PICKER:END -->`;

const html = await readFile(INDEX, "utf8");
if (!/<!-- TOOL-PICKER:START -->/.test(html) || !/<!-- TOOL-PICKER:END -->/.test(html)) {
  console.error("build-tool-picker: TOOL-PICKER markers not found in index.html.");
  process.exit(1);
}
const replaced = html.replace(
  /[ \t]*<!-- TOOL-PICKER:START -->[\s\S]*?<!-- TOOL-PICKER:END -->/,
  block,
);

if (CHECK) {
  if (replaced !== html) {
    console.error(
      "build-tool-picker --check: index.html tool-picker is stale (" + tiles.length +
      " tiles). Run `node scripts/build-tool-picker.mjs` and commit.",
    );
    process.exit(1);
  }
  console.log("build-tool-picker --check OK: " + tiles.length + " tiles, picker in sync.");
} else {
  await writeFile(INDEX, replaced);
  const note = replaced === html ? "no change" : "updated";
  console.log("build-tool-picker: " + note + ", " + tiles.length + " tiles (" + INDEX + ")");
}
