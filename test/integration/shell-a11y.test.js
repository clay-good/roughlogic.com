// Accessibility of the STATIC shells, which nothing swept until 2026-08-31.
//
// a11y.test.js runs axe-core over all 1,804 routes -- every one of them a SPA
// hash route, `/index.html#<id>`. The static shells under `/tools/<id>/` and
// `/groups/<slug>/` are a different document: their own markup, their own
// stylesheet path, zero JavaScript. They are also the pages a search engine
// indexes and a no-JS reader lands on. Not one of them had ever been through
// axe. `readable-type.test.js` visits exactly two of them, and only to measure
// font sizes.
//
// WHAT THIS DOES NOT CHECK: the other ~1,730 tile shells. Every tile shell
// comes from one generator, so a second page of the same shape re-tests the
// template rather than the page; what varies is the SHAPE -- a group hub, the
// catalog hub, a tile with a worked example, a reference page with a nested
// table, a name that has to be HTML-escaped. This sweep covers one of each,
// deterministically chosen and listed in the test names, so a failure names a
// page you can open. Volume lives in the SPA sweep next door.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GROUP_SLUG } from "../../scripts/build-shells.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// Parsed, not imported: the same narrow scan a11y.test.js uses, so loading
// this file never executes the catalog.
function readTools() {
  const src = readFileSync(join(ROOT, "tools-data.js"), "utf8");
  const out = [];
  const re = /\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"((?:[^"\\]|\\.)+)"\s*,\s*group:\s*"([^"]+)"/g;
  for (const m of src.matchAll(re)) out.push({ id: m[1], name: m[2], group: m[3] });
  return out;
}

// A tile with no worked-example INPUTS renders a Reference section instead of
// an Example -- the shape added on 2026-08-31, and the reason this file exists.
function readExampleInputCounts() {
  const raw = JSON.parse(readFileSync(join(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const rows = Array.isArray(raw) ? raw : (raw.examples || raw.rows || []);
  const counts = new Map();
  for (const row of rows) {
    if (row && row.tile_id && !counts.has(row.tile_id)) {
      counts.set(row.tile_id, Object.keys(row.inputs || {}).length);
    }
  }
  return counts;
}

const TOOLS = readTools();
const INPUT_COUNTS = readExampleInputCounts();
const routes = new Map();
const add = (url, why) => { if (!routes.has(url)) routes.set(url, why); };

add("/", "home");
add("/tools/", "catalog hub");
add("/404.html", "not-found page");
for (const g of [...new Set(TOOLS.map((t) => t.group))].sort()) {
  add(`/groups/${GROUP_SLUG[g] || g.toLowerCase()}/`, `group hub ${g}`);
  const first = TOOLS.find((t) => t.group === g);
  if (first) add(`/tools/${first.id}/`, `tile in group ${g}`);
}
// Every reference page: the newest shape on the site, and the one whose markup
// is generated from a result shape rather than from a fixed template.
for (const t of TOOLS) {
  if (!INPUT_COUNTS.get(t.id)) add(`/tools/${t.id}/`, "reference page");
}
// Structural outliers: the longest name (title truncation), a name carrying
// characters that must be escaped, and the widest worked example.
const longest = TOOLS.slice().sort((a, b) => b.name.length - a.name.length || a.id.localeCompare(b.id))[0];
if (longest) add(`/tools/${longest.id}/`, "longest tile name");
const escaped = TOOLS.filter((t) => /['&<>]/.test(t.name)).sort((a, b) => a.id.localeCompare(b.id))[0];
if (escaped) add(`/tools/${escaped.id}/`, "name needing HTML escaping");
const widest = TOOLS.slice()
  .sort((a, b) => (INPUT_COUNTS.get(b.id) || 0) - (INPUT_COUNTS.get(a.id) || 0) || a.id.localeCompare(b.id))[0];
if (widest) add(`/tools/${widest.id}/`, "widest worked example");

for (const [url, why] of routes) {
  test(`a11y: shell ${url} (${why})`, async ({ page }) => {
    const response = await page.goto(url);
    // A shell that 404s would sweep an error page clean; the gate has to see
    // the document it claims to check.
    expect(response.status(), `${url} did not serve`).toBeLessThan(400);
    await expect(page.locator("h1")).toHaveCount(1);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });
}

test("a11y: the shell sweep covers every page shape, not a sample of one", () => {
  // A sweep that quietly shrank to the home page would still pass every test
  // above. Assert the shapes it is here to cover.
  const urls = [...routes.keys()];
  const groups = new Set(TOOLS.map((t) => t.group));
  expect(urls.filter((u) => u.startsWith("/groups/")).length).toBe(groups.size);
  expect([...routes.values()].filter((w) => w === "reference page").length).toBeGreaterThanOrEqual(20);
  expect(urls.length).toBeGreaterThanOrEqual(60);
});
