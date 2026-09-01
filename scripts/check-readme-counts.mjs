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
import { assertFullCatalogParse } from "./catalog-size.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function liveCounts() {
  const toolsData = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const tiles = (toolsData.match(/^\s*\{ id: "/gm) || []).length;
  // Every count this gate pins into the README and the docs is derived from
  // that line-start match, so a tile the match misses would quietly lower the
  // number the docs are held to. Check it against the module itself.
  await assertFullCatalogParse(tiles, "check-readme-counts");
  const groups = new Set([...toolsData.matchAll(/group: "([A-Z])"/g)].map((m) => m[1])).size;
  const files = await readdir(ROOT);
  const modules = files.filter((f) => /^calc-.*\.js$/.test(f)).length;
  // sitemap = one URL per tile + one per active group + home + the
  // spec-v1345 catalog hub at /tools/.
  const sitemap = tiles + groups + 2;
  // The README tells a reader how many gates stand between a change and a
  // landing. That is the `npm run lint` chain itself, so read it rather than
  // trusting a number someone typed once.
  const pkg = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
  const gates = String(pkg.scripts.lint || "").split("&&").filter((c) => c.trim()).length;
  // Coverage figures the prose quotes: how many calculators the browser's
  // field index reaches, and how many carry a field schema. Both are stated in
  // docs and in mcp/README.md, and both drifted -- data-sources.md still said
  // the index reached 1,739 of the 1,425 that carry a schema, long after both
  // numbers had moved. Read from the generated artefacts themselves.
  const shardDir = resolve(ROOT, "data", "fields");
  const indexed = new Set();
  for (const f of await readdir(shardDir)) {
    if (f === "manifest.json" || !f.endsWith(".json")) continue;
    const shard = JSON.parse(await readFile(resolve(shardDir, f), "utf8"));
    for (const id of Object.keys(shard.tiles || shard)) indexed.add(id);
  }
  const coverage = JSON.parse(
    await readFile(resolve(ROOT, "test", "fixtures", "renderer-schema-coverage.json"), "utf8"),
  );
  // docs/performance.md quotes the shape of the data pipeline. It said "117
  // entries across 18 dataset folders" while the live figures were 119 and 19,
  // and its module bullet said 24 against a live 57 -- enumerating three
  // modules spec-v107 had already deleted. Derive both from the artefacts.
  const expectedHashes = JSON.parse(
    await readFile(resolve(ROOT, "scripts", "expected-hashes.json"), "utf8"),
  );
  const integrity = JSON.parse(await readFile(resolve(ROOT, "data", "integrity.json"), "utf8"));
  // The launch checklist quotes the citation-strings row count in three
  // places. It said 52 of 52 against a live 70 -- the number moved 18 rows and
  // the "alignment floor" line moved not at all. Read it from the artefact.
  const citationStrings = JSON.parse(
    await readFile(resolve(ROOT, "docs", "citation-strings.generated.json"), "utf8"),
  )._row_count;
  // The launch checklist's "Current state" section is the only part of that
  // file kept live; every section above it is a frozen snapshot. Its suite
  // counts are the files themselves, so read them rather than trusting a
  // number someone typed once -- which is exactly how the v0.14 section came
  // to report 385 tiles and 24 calc modules four months after both moved.
  const unitSuites = (await readdir(resolve(ROOT, "test", "unit")))
    .filter((f) => f.endsWith(".test.js")).length;
  const integrationSpecs = (await readdir(resolve(ROOT, "test", "integration")))
    .filter((f) => f.endsWith(".test.js")).length;
  return {
    citationStrings, unitSuites, integrationSpecs,
    tiles, groups, modules, sitemap, gates,
    indexedTiles: indexed.size,
    schemaTiles: coverage.covered_count,
    unindexedTiles: tiles - indexed.size,
    dataEntries: Object.keys(expectedHashes.hashes || {}).length,
    dataFolders: Object.keys(integrity.manifests || {}).length,
  };
}

// For a label-anchored pattern, collect every number that precedes/follows
// the stable label and assert each equals `expected`.
function checkPattern(readme, re, expected, label, errors) {
  // The label already names the file when it is not the README, and a message
  // that opens "README:" while pointing at docs/performance.md is the same
  // class of defect this gate exists to catch.
  const where = /\(([^)]+\.md)\)/.exec(label);
  const source = where ? where[1] : "README.md";
  let m, found = 0;
  while ((m = re.exec(readme))) {
    found++;
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (n !== expected) {
      errors.push(`${source}: "${m[0].replace(/\\n/g, "\\n").trim()}" states ${n}, but the live ${label.replace(/\s*\([^)]+\.md\)$/, "")} is ${expected}.`);
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


// The README quotes one calculator's worked example in full -- the first
// concrete thing a reader sees, and the page it points at is live. Nothing
// pinned it, so a change to voltage-drop's example or its labels would leave
// the front page quoting an answer the site no longer gives. Compare the table
// against the tile's own prerendered shell, which is what the README claims to
// be showing.
//
// (Written after briefly "fixing" a row that was already there: the table runs
// past the window I had printed, so it looked short. Reading half a file and
// concluding something is missing is exactly what a gate is for.)
async function checkReadmeExample(readme, errors) {
  const shellPath = resolve(ROOT, "dist", "tools", "voltage-drop", "index.html");
  let shell;
  try {
    shell = await readFile(shellPath, "utf8");
  } catch {
    return 0; // no build present; the post-build gates cover that case
  }
  const pairsFrom = (html, label) => {
    const start = html.indexOf(label);
    if (start === -1) return [];
    const block = html.slice(start, html.indexOf("</ul>", start));
    return [...block.matchAll(/<li><span>([^<]+)<\/span> <b>([^<]+)<\/b><\/li>/g)]
      .map((m) => [m[1].trim(), m[2].trim()]);
  };
  const shellIn = pairsFrom(shell, "You enter");
  const shellOut = pairsFrom(shell, "You get");
  if (!shellIn.length || !shellOut.length) return 0;

  // README table rows: "| <in label> | <in value> | <out label> | <out value> |"
  const table = readme.slice(readme.indexOf("| You enter |"));
  const rows = [...table.slice(0, table.indexOf("\n\n")).matchAll(/^\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|$/gm)]
    .map((m) => m.slice(1).map((c) => c.trim()))
    .filter((c) => c[0] && c[0] !== "You enter" && !/^-+$/.test(c[0]));
  const readmeIn = rows.filter((c) => c[0] && c[1]).map((c) => [c[0], c[1]]);
  const readmeOut = rows.filter((c) => c[2] && c[3]).map((c) => [c[2], c[3]]);

  const fmt = (pairs) => pairs.map(([k, v]) => k + " = " + v).join("; ");
  if (fmt(readmeIn) !== fmt(shellIn)) {
    errors.push(
      `README.md: the Voltage Drop example's "You enter" rows do not match the live tile page.\n` +
        `      README: ${fmt(readmeIn)}\n      tile:   ${fmt(shellIn)}`,
    );
  }
  // The shell prints every output; the README quotes the headline ones. Each
  // row it does quote has to be right, and in the tile's own order.
  const shellOutHead = shellOut.slice(0, readmeOut.length);
  if (fmt(readmeOut) !== fmt(shellOutHead)) {
    errors.push(
      `README.md: the Voltage Drop example's "You get" rows do not match the live tile page.\n` +
        `      README: ${fmt(readmeOut)}\n      tile:   ${fmt(shellOutHead)}`,
    );
  }
  return readmeIn.length + readmeOut.length;
}

async function main() {
  const readme = await readFile(resolve(ROOT, "README.md"), "utf8");
  const live = await liveCounts();
  const errors = [];
  let checked = 0;

  checked += await checkIndexHtml(live.tiles, errors);
  checked += await checkReadmeExample(readme, errors);

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

  // Field-index and schema-coverage figures, wherever the prose quotes them.
  // These move on every extractor improvement and were being hand-edited.
  const dataSources = await readFile(resolve(ROOT, "docs", "data-sources.md"), "utf8");
  checked += checkPattern(dataSources, /index reaches ([\d,]+) of [\d,]+/g, live.indexedTiles, "field-index tile count (docs/data-sources.md)", errors);
  checked += checkPattern(dataSources, /rather than the ([\d,]+) that carry a schema/g, live.schemaTiles, "schema-carrying tile count (docs/data-sources.md)", errors);
  checked += checkPattern(mcpReadme, /descriptors the website reads, which\s*\nexist for ([\d,]+) calculators/g, live.indexedTiles, "field-index tile count (mcp/README.md)", errors);
  checked += checkPattern(mcpReadme, /For the other ([\d,]+) it projects/g, live.unindexedTiles, "un-indexed tile count (mcp/README.md)", errors);

  // docs/architecture.md states the module count in prose too, and it had
  // drifted to 56 against a live 57.
  const arch = await readFile(resolve(ROOT, "docs", "architecture.md"), "utf8");
  checked += checkPattern(arch, /set has since grown to\s+(\d+)\s*\n?modules/g, live.modules, "calc-* module count (docs/architecture.md)", errors);
  // The same count sits in the architecture diagram, and in the file list
  // docs/deployment.md tells a deployer to copy. Pinning only the prose
  // sentence left both saying 56 against a live 57 the day after that fix.
  checked += checkPattern(arch, /dynamic-import: (\d+) calc-\* modules/g, live.modules, "calc-* module count (docs/architecture.md diagram)", errors);
  const deploy = await readFile(resolve(ROOT, "docs", "deployment.md"), "utf8");
  checked += checkPattern(deploy, /all (\d+) calc-\* modules from/g, live.modules, "calc-* module count (docs/deployment.md)", errors);

  // docs/performance.md: the calc-module count and the data-pipeline shape.
  // docs/launch-checklist.md: the citation-strings row count, in all three
  // places it appears.
  const launch = await readFile(resolve(ROOT, "docs", "launch-checklist.md"), "utf8");
  checked += checkPattern(launch, /\*\*(\d+) rows \/ \d+ tiles\*\*/g, live.citationStrings, "citation-strings row count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /holds \*\*(\d+) of \d+\*\* markdown rows/g, live.citationStrings, "citation-strings row count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /Citation alignment floor: (\d+) of \d+ markdown rows/g, live.citationStrings, "citation-strings row count (docs/launch-checklist.md)", errors);

  // docs/launch-checklist.md "Current state": the one maintained section of a
  // file whose every other section is a frozen snapshot. Anchored on "live
  // <thing>" so the figures are asserted rather than remembered.
  checked += checkPattern(launch, /\*\*([\d,]+) live tiles\*\*/g, live.tiles, "tile count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /\*\*(\d+) live groups\*\*/g, live.groups, "group count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /\*\*(\d+) live calc modules\*\*/g, live.modules, "calc-* module count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /\*\*([\d,]+) live sitemap URLs\*\*/g, live.sitemap, "sitemap URL count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /\*\*(\d+) live lint gates\*\*/g, live.gates, "lint gate count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /\*\*(\d+) live unit suites\*\*/g, live.unitSuites, "unit suite count (docs/launch-checklist.md)", errors);
  checked += checkPattern(launch, /\*\*(\d+) live integration specs\*\*/g, live.integrationSpecs, "integration spec count (docs/launch-checklist.md)", errors);

  const perf = await readFile(resolve(ROOT, "docs", "performance.md"), "utf8");
  checked += checkPattern(perf, /\((\d+) `calc-\*\.js` files/g, live.modules, "calc-* module count (docs/performance.md)", errors);
  checked += checkPattern(perf, /\*\*([\d,]+) integrity-checked entries/g, live.dataEntries, "integrity-checked entry count (docs/performance.md)", errors);
  checked += checkPattern(perf, /entries across ([\d,]+) dataset folders/g, live.dataFolders, "dataset folder count (docs/performance.md)", errors);

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
