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
// catches drift wherever the number lives in the prose. It derives the live
// values from the same sources the build uses.
//
// The README's Mermaid diagrams have since been removed, and with them the
// four diagram-node anchors above -- which is how the second half of this
// gate's job came to light. An anchor whose phrase disappears used to match
// nothing and say nothing, so those four sat dead while the prose beside one
// of them drifted (2026-09-10: "the N static shells are not precached" read
// 1,878 against a live 2,104, while the same sentence in docs/architecture.md
// and docs/deployment.md was anchored and read correctly). A zero-match anchor
// is therefore a FAILURE now, exactly like a wrong number: a claim may not
// stop being checked by quietly ceasing to be stated.
//
// Deterministic, offline, no build needed -> runs in the `npm run lint`
// chain. Standalone Node 20, built-ins only.

import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertFullCatalogParse } from "./catalog-size.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function liveCounts() {
  const toolsData = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const tiles = (toolsData.match(/^\s*\{ id: "/gm) || []).length;
  // How many tiles the related-tiles registry curates by hand. docs/seo.md
  // states this and the complement ("the remaining N") in one sentence, so
  // both move together and both are pinned to the same source of truth.
  const relatedSrc = await readFile(resolve(ROOT, "scripts", "related-tiles.mjs"), "utf8");
  const relatedCurated = (relatedSrc.match(/^\s{2}"[a-z0-9-]+":\s*\[/gm) || []).length;
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
  // The static shells themselves: every sitemap URL except home, which is the
  // SPA and not a generated shell. docs/architecture.md and docs/deployment.md
  // both state this to explain why the service worker does not precache them,
  // and it moves with every tile added.
  const shells = tiles + groups + 1;
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
  // The two shell gzip caps. docs/architecture.md and docs/deployment.md both
  // stated "6 KB / 12 KB" long after the group cap moved past 12 KB -- it has
  // been raised (and once lowered) nine times, and deployment.md was claiming
  // the hubs sit "well under" a cap the largest one had exceeded since
  // 2026-06-24. Read them from the gate that enforces them.
  const shellsSrc = await readFile(resolve(ROOT, "scripts", "check-shells.mjs"), "utf8");
  const capOf = (name) => {
    const m = new RegExp(name + "\\s*=\\s*(\\d+)\\s*\\*\\s*1024").exec(shellsSrc);
    return m ? Number(m[1]) * 1024 : 0;
  };
  return {
    shells,
    relatedCurated,
    tileGzipCap: capOf("TILE_GZIP_CAP"),
    groupGzipCap: capOf("GROUP_GZIP_CAP"),
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
// An anchor that matches NOTHING is an anchor guarding nothing. This walked the
// matches it found and said nothing when it found none, so a claim could be
// deleted -- or drift into a shape the pattern no longer recognises -- and the
// gate stayed green. Both happened at once: the four Mermaid-node anchors this
// file was written for went dead when the README's diagrams were removed, and
// the prose beside one of them ("the N static shells are not precached") then
// rotted to 1,878 against a live 2,104 with nothing watching. So a zero-match
// anchor is now a failure, the same way a wrong number is. If a sentence moves,
// move its anchor; if a claim is genuinely retired, delete the anchor
// deliberately in the same commit.
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
  if (found === 0) {
    errors.push(
      `${source}: the phrase stating the ${label.replace(/\s*\([^)]+\.md\)$/, "")} is gone -- ` +
      `nothing there matches /${re.source}/. It is anchored here so the figure cannot rot; if the ` +
      `sentence moved, move this anchor with it rather than leaving an anchor that guards nothing.`);
  }
  return found;
}

// Read a figure out of a gate's OWN summary line rather than recomputing it
// here. A second implementation of the same count is the drift this gate
// exists to catch: the README's trade-off table quoted six figures that were
// hand-typed and had all rotted (1,731 tolerance checks against a live 3,431,
// 1,875 registry ids against 2,082, 1,673/131 example-parity against
// 1,797/285). Parsing the gate's output makes disagreement impossible by
// construction. Each of these runs in well under a second and is already in
// the lint chain, so the cost is a second process, not a second sweep.
function gateFigure(script, re, label, args = []) {
  let out;
  try {
    out = execFileSync("node", [resolve(ROOT, "scripts", script), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    throw new Error(`check-readme-counts: could not run ${script} to derive ${label}: ${e && e.message}`);
  }
  const m = re.exec(out);
  if (!m) throw new Error(`check-readme-counts: ${script} no longer prints the ${label} its summary line is parsed for. Update the pattern here and in the README together.`);
  return Number(String(m[1]).replace(/,/g, ""));
}

// index.html states the exact tile count in two spots: the JSON-LD
// `description` and the home hero lede. Both read "<N> free calculators for
// ...". Anchor on that stable label and assert the (comma-grouped) number
// equals the live tile count, so a landing that forgets to bump the home
// view fails the lint chain instead of silently advertising a stale figure.
// The home page describes itself twice: once in index.html's <meta
// name="description">, which is what a crawler and a link preview read, and
// once in app.js's HOME_DESC, which the SPA writes over the top of it on every
// home render. Both were the literal string "Rough Logic" until 2026-09-01.
// Fixing only the file left the running page still saying it, and the gate
// that watches the file could not tell -- it reads dist/index.html, not a
// browser. So: assert the two are the same string. That also pins the tile
// count inside the app.js copy, transitively, since the file copy is pinned
// above.
// mcp/package.json describes a package that cannot exist.
//
// The MCP server is local-only by design ("No hosting, no network" -- the
// project's hard rule), and mcp/README.md is careful to say `npx
// roughlogic-mcp` works "from a checkout". But the manifest was not private
// and carried `files: ["server.mjs", "catalog.mjs", "README.md"]`, which
// describes a publishable tarball -- and catalog.mjs imports
// ../search-discovery.js, ../limitation-banner.js, ../scripts/ and
// ../test/fixtures/, then lazy-imports the calc-*.js modules. Anything
// published from that list would install and then fail on its first import.
// Its version was 0.175.0 while the server reports the ROOT package's version,
// 0.401.1, so the two numbers a user could read disagreed by 226 releases.
async function checkMcpManifest(errors) {
  const root = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
  const mcp = JSON.parse(await readFile(resolve(ROOT, "mcp", "package.json"), "utf8"));
  let checked = 0;

  checked++;
  if (mcp.private !== true) {
    errors.push(
      'mcp/package.json: not marked "private": true. The server reads the repo it sits in ' +
        "(catalog.mjs imports ../search-discovery.js, ../scripts/ and ../test/fixtures/), so a published " +
        "tarball could not run. `npm link` and `npx roughlogic-mcp` from a checkout are unaffected by private.",
    );
  }

  checked++;
  if (mcp.files) {
    errors.push(
      "mcp/package.json: carries a `files` list, which describes a publish that cannot work -- " +
        JSON.stringify(mcp.files) + " omits every module the server imports.",
    );
  }

  // server.mjs reports the ROOT version over JSON-RPC (serverInfo.version), so
  // the manifest beside it must not claim a different one.
  checked++;
  if (mcp.version !== root.version) {
    errors.push(
      `mcp/package.json: version ${mcp.version} but the server reports the root package's ${root.version} ` +
        "in serverInfo. One server, one version.",
    );
  }
  return checked;
}

async function checkHomeDescription(errors) {
  const html = await readFile(resolve(ROOT, "index.html"), "utf8");
  const app = await readFile(resolve(ROOT, "app.js"), "utf8");
  const meta = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html);
  const home = /const HOME_DESC\s*=\s*\n?\s*"((?:[^"\\]|\\.)*)"/.exec(app);
  if (!meta) {
    errors.push('index.html: no <meta name="description"> to compare against app.js HOME_DESC.');
    return 0;
  }
  if (!home) {
    errors.push("app.js: could not read HOME_DESC. Did the declaration change shape?");
    return 0;
  }
  const fromFile = meta[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const fromApp = home[1].replace(/\\"/g, '"');
  if (fromFile !== fromApp) {
    errors.push(
      "app.js HOME_DESC and index.html's meta description differ. The SPA writes HOME_DESC over " +
      "the meta tag on every home render, so a reader sees the app.js one and a crawler sees the " +
      "file one.\n    file: " + JSON.stringify(fromFile) + "\n    app.js: " + JSON.stringify(fromApp));
  }
  return 1;
}

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
  checked += await checkHomeDescription(errors);
  checked += await checkMcpManifest(errors);
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

  // The static-shell total, stated in both documents to explain why the
  // service worker does not precache them, and the tile-shell count in the
  // accessibility doc's note on what the shell a11y sweep does not visit.
  checked += checkPattern(arch, /\*\*(\d+) static shells\*\*/g, live.shells, "static shell count (docs/architecture.md)", errors);
  checked += checkPattern(deploy, /\*\*(\d+) static shells\*\*/g, live.shells, "static shell count (docs/deployment.md)", errors);
  const a11y = await readFile(resolve(ROOT, "docs", "accessibility.md"), "utf8");
  checked += checkPattern(a11y, /\*\*([\d,]+) tile shells\*\*/g, live.tiles, "tile shell count (docs/accessibility.md)", errors);

  // The shell gzip caps, wherever the prose states them.
  checked += checkPattern(arch, /\*\*(\d+) B\*\* per tile shell/g, live.tileGzipCap, "tile shell gzip cap (docs/architecture.md)", errors);
  checked += checkPattern(arch, /\*\*(\d+) B\*\* per group hub/g, live.groupGzipCap, "group hub gzip cap (docs/architecture.md)", errors);
  checked += checkPattern(deploy, /\*\*(\d+) B\*\* per tile shell/g, live.tileGzipCap, "tile shell gzip cap (docs/deployment.md)", errors);
  checked += checkPattern(deploy, /\*\*(\d+) B\*\* per group hub/g, live.groupGzipCap, "group hub gzip cap (docs/deployment.md)", errors);

  const perf = await readFile(resolve(ROOT, "docs", "performance.md"), "utf8");
  checked += checkPattern(perf, /\((\d+) `calc-\*\.js` files/g, live.modules, "calc-* module count (docs/performance.md)", errors);
  checked += checkPattern(perf, /\*\*([\d,]+) integrity-checked entries/g, live.dataEntries, "integrity-checked entry count (docs/performance.md)", errors);
  checked += checkPattern(perf, /entries across ([\d,]+) dataset folders/g, live.dataFolders, "dataset folder count (docs/performance.md)", errors);

  // Tile count: the prose "(N)".
  //
  // RETIRED HERE: the three Mermaid-node anchors this file was originally
  // written for -- the /tools/ and /groups/ shell-diagram nodes and the
  // architecture diagram's "N group modules" -- plus the sitemap.xml node
  // below. The README no longer contains a Mermaid block at all, so all four
  // matched nothing while the gate reported OK. They are deleted rather than
  // left in place: an anchor for content that does not exist is a dead
  // exemption, and now that a zero-match anchor fails, leaving them would fail
  // the build for a diagram nobody intends to bring back. If the diagrams
  // return, so should the anchors.
  checked += checkPattern(readme, /shell per tile \((\d+)\)/g, live.tiles, "tile count", errors);

  // Module count: the file-tree line.
  checked += checkPattern(readme, /(\d+) per-group calculator modules/g, live.modules, "calc-* module count", errors);

  const correctness = await readFile(resolve(ROOT, "docs", "correctness.md"), "utf8");
  const a11yDoc = await readFile(resolve(ROOT, "docs", "accessibility.md"), "utf8");
  const contributing = await readFile(resolve(ROOT, "CONTRIBUTING.md"), "utf8");

  // CONTRIBUTING.md repeats the README's `check-tile-registries` claim -- "every
  // one of those registries holds all N ids" -- on the surface GitHub links from
  // the Contribute panel. The README's copy was corrected on 2026-09-10 and this
  // one was not, because nothing was watching it: it still said 1,804.
  checked += checkPattern(contributing, /registries holds all ([\d,]+)/g, live.tiles, "registry id count (CONTRIBUTING.md)", errors);

  // The shell total again, on the two surfaces that describe what sweeps it.
  // Both said 1,826 -- 1,804 tiles + 21 groups + the hub, the arithmetic of a
  // catalog two campaigns old.
  checked += checkPattern(a11yDoc, /The ([\d,]+) prerendered pages load no script/g, live.shells, "prerendered page count (docs/accessibility.md)", errors);
  checked += checkPattern(a11yDoc, /checked offline on all ([\d,]+)/g, live.shells, "prerendered page count (docs/accessibility.md)", errors);
  const checklist = await readFile(resolve(ROOT, "docs", "contributor-checklist.md"), "utf8");
  checked += checkPattern(checklist, /([\d,]+) shells through a headless browser/g, live.shells, "shell count (docs/contributor-checklist.md)", errors);

  // docs/correctness.md states the dimension-annotation coverage as a live
  // fact. It read "2,059 of 2,059 across 58 modules" against 2,337 across 78.
  // The function count comes from the gate that produces it; the module count
  // is the calc-* modules plus pure-math.js, which that sweep also covers.
  const dimsFns = gateFigure("check-dimensions.mjs", /([\d,]+) \/ [\d,]+ functions annotated/, "annotated-function count");
  checked += checkPattern(correctness, /([\d,]+) of [\d,]+ across \d+ modules/g, dimsFns, "annotated-function count (docs/correctness.md)", errors);
  checked += checkPattern(correctness, /[\d,]+ of [\d,]+ across (\d+) modules/g, live.modules + 1, "annotated-module count (docs/correctness.md)", errors);

  // mcp/README.md quotes the query-fill corpus size in a fourth place. d073f51a
  // refreshed the figures that had gone stale when the corpus moved and missed
  // this one, which still read 1,763 -- the corpus size from 2026-09-01. It is
  // the same population the field index covers, so it pins to the same value.
  checked += checkPattern(mcpReadme, /Recovery across all ([\d,]+) tiles is/g, live.indexedTiles, "query-fill corpus size (mcp/README.md)", errors);

  // docs/seo.md quotes the home lede, describes the related-tiles registry's
  // coverage, and counts the catalog twice more in prose. It said 1,804 in all
  // four places -- including in a sentence whose whole point is that the string
  // is "already pinned by check-readme-counts", which it was: the pinned copy in
  // index.html read 2,082 while the doc quoting it read 1,804.
  const seo = await readFile(resolve(ROOT, "docs", "seo.md"), "utf8");
  checked += checkPattern(seo, /pinned by `check-readme-counts`: "([\d,]+) free calculators/g, live.tiles, "tile count (docs/seo.md)", errors);
  checked += checkPattern(seo, /covered it entirely\. The remaining ([\d,]+),/g, live.tiles - live.relatedCurated, "uncurated tile count (docs/seo.md)", errors);
  checked += checkPattern(seo, /The registry covers ([\d,]+) of the/g, live.relatedCurated, "curated related-tiles entry count (docs/seo.md)", errors);
  checked += checkPattern(seo, /of the\n  ([\d,]+) tiles; the catalog outgrew/g, live.tiles, "tile count (docs/seo.md)", errors);
  checked += checkPattern(seo, /across ([\d,]+) tiles, a mean of/g, live.tiles, "tile count (docs/seo.md)", errors);
  checked += checkPattern(seo, /no way back into ([\d,]+) calculators/g, live.tiles, "tile count (docs/seo.md)", errors);
  checked += checkPattern(perf, /It needs 1 of ([\d,]+)\./g, live.tiles, "tile count (docs/performance.md)", errors);

  // docs/performance.md states the per-tile shell count as a live fact about
  // what the build emits, and docs/correctness.md states the catalog size twice
  // in the sentence explaining why a partial parse reads like a full one. Both
  // still said 1,804 on 2026-09-10. Neither was anchored; both are now.
  // Anchored on the /tools/ path: the very next clause says "(`/groups/<slug>/
  // index.html`, 21 shells)", and a pattern that matched both compared the
  // group count against the tile count.
  checked += checkPattern(perf, /\/tools\/<id>\/index\.html`, ([\d,]+) shells\)/g, live.tiles, "per-tile shell count (docs/performance.md)", errors);
  checked += checkPattern(perf, /\/groups\/<slug>\/index\.html`, ([\d,]+) shells\)/g, live.groups, "per-group shell count (docs/performance.md)", errors);
  checked += checkPattern(correctness, /covered 1,700 of ([\d,]+) prints/g, live.tiles, "catalog size (docs/correctness.md)", errors);
  checked += checkPattern(correctness, /a sweep that covered all\n([\d,]+) prints/g, live.tiles, "catalog size (docs/correctness.md)", errors);

  // docs/accessibility.md says how many routes the axe sweep visits. The sweep
  // itself reads TOOLS at run time and auto-scales, so only the PROSE rots --
  // and it had, to 1,804, the catalog size two campaigns back. One route per
  // tile plus the home view.
  checked += checkPattern(a11yDoc, /runs ([\d,]+) routes that are all SPA hash routes/g, live.tiles + 1, "axe route count (docs/accessibility.md)", errors);

  // The static-shell total, which THREE surfaces state and only two were
  // anchored. docs/architecture.md and docs/deployment.md both say "N static
  // shells is not a precache" and both were pinned above, so both read the
  // live 2,104. The README makes the identical claim in its "How it's built"
  // paragraph, was pinned only through a Mermaid node that no longer exists,
  // and had rotted to 1,878 -- a catalog-and-a-bit out of date, on the copy a
  // reader meets first.
  checked += checkPattern(readme, /The ([\d,]+) static shells are not precached/g, live.shells, "static shell count", errors);

  // Gate count: the trust section's headline number and the develop-section
  // comment. A reader is being told how much has to pass; say the real number.
  checked += checkPattern(readme, /runs (\d+) static gates/g, live.gates, "lint gate count", errors);
  checked += checkPattern(readme, /static-gate chain \((\d+) checks\)/g, live.gates, "lint gate count", errors);

  // CONTRIBUTING.md tells a first-time contributor how much has to pass. It is
  // the same claim the README makes, on the surface GitHub links from the
  // "Contribute" panel, so it drifts the same way and is pinned the same way.
  checked += checkPattern(contributing, /alone is (\d+) static gates/g, live.gates, "lint gate count (CONTRIBUTING.md)", errors);

  // Sitemap URL count: the prose "carries N URLs" (the build-diagram node is
  // retired with the other three -- see the note above).
  checked += checkPattern(readme, /carries (\d+) URLs/g, live.sitemap, "sitemap URL count", errors);

  // ---- "Why you can trust the answers": the reach of each guarantee ----
  //
  // Every figure in that table says how FAR a gate's promise extends, which is
  // the half a reader weighs. All six below were hand-typed and all six had
  // rotted -- most of them frozen at a catalog size two campaigns old, and one
  // ("Five take a named object parameter") describing a budget that had since
  // been drained to zero. They are anchored to the gate that produces them.

  // check-cross-validation: how many tolerance checks the ceiling polices.
  const xvalChecks = gateFigure("check-cross-validation.mjs", /([\d,]+) tolerance check/, "tolerance-check count");
  checked += checkPattern(readme, /or carries a written justification \(([\d,]+) checks\)/g, xvalChecks, "cross-validation tolerance-check count", errors);

  // check-example-parity: the static half and the browser-driven half, which
  // must also add up to the catalog -- the README's old trio (1,673 + 131)
  // summed to 1,804 while claiming to cover 1,875, so the arithmetic was the
  // tell before any gate was consulted.
  const parityRuntime = execFileSync("node", [resolve(ROOT, "scripts", "check-example-parity.mjs"), "--list-unresolved"], { encoding: "utf8" })
    .split("\n").map((x) => x.trim()).filter(Boolean).length;
  const parityStatic = live.tiles - parityRuntime;
  checked += checkPattern(readme, /\(([\d,]+) tiles statically;/g, parityStatic, "example-parity static tile count", errors);
  checked += checkPattern(readme, /the ([\d,]+) that declare theirs inline/g, parityRuntime, "example-parity runtime tile count", errors);
  checked += checkPattern(readme, /so the claim covers all ([\d,]+)\)/g, live.tiles, "example-parity total tile count", errors);

  // check-dead-inputs: the computes the destructuring sweep actually reaches.
  const deadInputComputes = gateFigure("check-dead-inputs.mjs", /([\d,]+) computes that destructure their inputs/, "destructuring-compute count");
  checked += checkPattern(readme, /across the ([\d,]+) computes that destructure their inputs/g, deadInputComputes, "destructuring-compute count", errors);

  // check-tile-registries: the id count every full registry must hold.
  checked += checkPattern(readme, /names every registry that holds all ([\d,]+) ids/g, live.tiles, "registry id count", errors);

  // NOT anchored here: the "N of them are first-principles" figure in the same
  // table. `check-worked-examples` already holds that sentence to the registry,
  // and it counts tiles whose worked examples are self-sourced in EVERY row --
  // not, as a second implementation here first assumed, tiles with any such
  // row. Two gates policing one sentence under two definitions is the drift
  // this file exists to prevent, so that claim stays with its own gate.

  // The lede splits the gate count into "the ones anyone can run" and
  // `check-ngrams`, the only gate that needs a file this repository does not
  // ship. Spelled out, so it escaped the numeric anchors above and drifted:
  // it still read fifty-six/fifty-seventh at 59 gates.
  // Two forms: the first number is cardinal ("Fifty-eight of them run"), the
  // second ordinal ("the fifty-ninth, check-ngrams").
  const CARDINALS = ["fifty-five", "fifty-six", "fifty-seven", "fifty-eight", "fifty-nine", "sixty", "sixty-one", "sixty-two"];
  const ORDINALS = ["fifty-fifth", "fifty-sixth", "fifty-seventh", "fifty-eighth", "fifty-ninth", "sixtieth", "sixty-first", "sixty-second"];
  const runnable = CARDINALS[live.gates - 1 - 55] || null;
  const privateGate = ORDINALS[live.gates - 55] || null;
  if (runnable && privateGate) {
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    const wanted = `${cap(runnable)} of them run for anyone who clones this repository; the ${privateGate}, \`check-ngrams\`,`;
    if (!readme.includes(wanted)) {
      errors.push(
        `README.md: with ${live.gates} lint gates the trust-section lede should read ` +
        `"${cap(runnable)} of them run for anyone who clones this repository; the ${privateGate}, \`check-ngrams\`," ` +
        `-- check-ngrams is the only gate that skips without a file this repository does not ship.`);
    }
    checked += 1;
  }

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
