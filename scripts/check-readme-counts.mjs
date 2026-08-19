#!/usr/bin/env node
// spec-v49: README catalog-count gate.
//
// The README states the catalog's size in several places -- the headline,
// the file-tree, the prose, and two Mermaid diagrams. The count-bump
// recipe updates the prose and table cells, but Mermaid nodes glue the
// number to a literal "\n" (e.g. "calc-*.js\n30 group modules"), and a
// `\b<old>\b` word-boundary substitution does NOT match a digit glued to
// the "n" of "\n". So the diagram numbers silently drifted: the
// prerendered-shell diagram read "555 static shells" and "581 URLs", and
// the architecture diagram read "28 group modules", while the catalog had
// moved to 577 tiles / 603 URLs / 30 modules. The prose beside each was
// correct; only the diagrams rotted, for ~20 spec landings.
//
// This gate pins the catalog invariants in the README by anchoring on the
// stable LABEL next to each number (not the number's position), so it
// catches drift whether the number lives in prose or a Mermaid node. It
// derives the live values from the same sources the build uses.
//
// Deterministic, offline, no build needed -> runs in the `npm run lint`
// chain. Standalone Node 20, built-ins only.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function liveCounts() {
  const toolsData = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const tiles = (toolsData.match(/^\s*\{ id: "/gm) || []).length;
  const groups = new Set([...toolsData.matchAll(/group: "([A-Z])"/g)].map((m) => m[1])).size;
  const files = await readdir(ROOT);
  const modules = files.filter((f) => /^calc-.*\.js$/.test(f)).length;
  // sitemap = one URL per tile + one per active group + home.
  const sitemap = tiles + groups + 1;
  // The README tells a reader how many gates stand between a change and a
  // landing. That is the `npm run lint` chain itself, so read it rather than
  // trusting a number someone typed once.
  const pkg = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
  const gates = String(pkg.scripts.lint || "").split("&&").filter((c) => c.trim()).length;
  return { tiles, groups, modules, sitemap, gates };
}

// For a label-anchored pattern, collect every number that precedes/follows
// the stable label and assert each equals `expected`.
function checkPattern(readme, re, expected, label, errors) {
  let m, found = 0;
  while ((m = re.exec(readme))) {
    found++;
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (n !== expected) {
      errors.push(`README: "${m[0].replace(/\\n/g, "\\n").trim()}" states ${n}, but the live ${label} is ${expected}.`);
    }
  }
  return found;
}

// index.html states the exact tile count in two spots: the JSON-LD
// `description` and the home hero lede. Both read "<N> free calculators for
// ...". Anchor on that stable label and assert the (comma-grouped) number
// equals the live tile count, so a landing that forgets to bump the home
// view fails the lint chain instead of silently advertising a stale figure.
async function checkIndexHtml(expectedTiles, errors) {
  const html = await readFile(resolve(ROOT, "index.html"), "utf8");
  const re = /([\d,]+) free calculators for/g;
  let m, found = 0;
  while ((m = re.exec(html))) {
    found++;
    const n = Number(m[1].replace(/,/g, ""));
    if (n !== expectedTiles) {
      errors.push(
        `index.html: "${m[0].trim()}" states ${n}, but the live tile count is ${expectedTiles}. ` +
          `Update both the JSON-LD description and the home lede in index.html.`,
      );
    }
  }
  if (found < 2) {
    errors.push(
      `index.html: expected 2 "<N> free calculators for" count strings (JSON-LD + hero lede), found ${found}. ` +
        `Did the home copy change? Update this gate if so.`,
    );
  }
  return found;
}

async function main() {
  const readme = await readFile(resolve(ROOT, "README.md"), "utf8");
  const live = await liveCounts();
  const errors = [];
  let checked = 0;

  checked += await checkIndexHtml(live.tiles, errors);

  // AGENTS.md (spec-v1194) states the catalog size for agents landing in the
  // repo; anchor on its labels so the numbers cannot rot.
  const agents = await readFile(resolve(ROOT, "AGENTS.md"), "utf8");
  checked += checkPattern(agents, /([\d,]+) calculators\*\* for/g, live.tiles, "tile count (AGENTS.md)", errors);
  checked += checkPattern(agents, /([\d,]+) calc modules/g, live.modules, "calc-* module count (AGENTS.md)", errors);

  // The headline count a reader meets first, in the root README's opening
  // sentence and in the MCP server's. Both had drifted to "more than 1,000"
  // against a live 1,709; anchor them so the front-door number cannot rot.
  checked += checkPattern(readme, /is ([\d,]+) small, single-purpose calculators/g, live.tiles, "tile count (README lede)", errors);
  const mcpReadme = await readFile(resolve(ROOT, "mcp", "README.md"), "utf8");
  checked += checkPattern(mcpReadme, /\*\*([\d,]+) trades calculators\*\*/g, live.tiles, "tile count (mcp/README.md)", errors);

  // Tile count: the /tools/ shell-diagram node and the prose "(N)".
  // ("static shells" also labels the /groups/ node, so anchor on the path.)
  checked += checkPattern(readme, /\/tools\/&lt;id&gt;\/index\.html\\n(\d+) static shells/g, live.tiles, "tile count", errors);
  checked += checkPattern(readme, /shell per tile \((\d+)\)/g, live.tiles, "tile count", errors);
  // Group count: the /groups/ shell-diagram node.
  checked += checkPattern(readme, /\/groups\/&lt;slug&gt;\/index\.html\\n(\d+) static shells/g, live.groups, "group count", errors);

  // Module count: the architecture diagram node and the file-tree line.
  checked += checkPattern(readme, /(\d+) group modules/g, live.modules, "calc-* module count", errors);
  checked += checkPattern(readme, /(\d+) per-group calculator modules/g, live.modules, "calc-* module count", errors);

  // Gate count: the trust section's headline number and the develop-section
  // comment. A reader is being told how much has to pass; say the real number.
  checked += checkPattern(readme, /runs (\d+) static gates/g, live.gates, "lint gate count", errors);
  checked += checkPattern(readme, /static-gate chain \((\d+) checks\)/g, live.gates, "lint gate count", errors);

  // Sitemap URL count: the build diagram node and the prose "carries N URLs".
  checked += checkPattern(readme, /sitemap\.xml\\n(\d+) URLs/g, live.sitemap, "sitemap URL count", errors);
  checked += checkPattern(readme, /carries (\d+) URLs/g, live.sitemap, "sitemap URL count", errors);

  if (errors.length) {
    console.error("check-readme-counts FAILED (live: " + JSON.stringify(live) + "):");
    for (const e of errors) console.error("  - " + e);
    console.error("  Fix the README number(s). Note: Mermaid nodes glue the count to \\n, so a \\b<old>\\b perl will not match -- edit those explicitly.");
    process.exit(1);
  }
  console.log(
    "check-readme-counts OK: " + checked + " label-anchored catalog counts in README match live values " +
    "(" + live.tiles + " tiles, " + live.modules + " modules, " + live.sitemap + " sitemap URLs, " + live.gates + " lint gates).",
  );
}

main().catch((e) => {
  console.error("check-readme-counts: unexpected error", e);
  process.exit(1);
});
