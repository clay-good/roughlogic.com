import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const ROOT = new URL("../../", import.meta.url);
const html = await readFile(new URL("index.html", ROOT), "utf8");
const app = await readFile(new URL("app.js", ROOT), "utf8");
const integrity = await readFile(new URL("integrity.js", ROOT), "utf8");

function entityDecode(s) {
  return s.replaceAll("&#39;", "'").replaceAll("&amp;", "&").replaceAll("&quot;", '"');
}

function content(attribute, value) {
  const match = new RegExp(`<meta\\s+${attribute}="${value}"\\s+content="([^"]+)"`).exec(html);
  assert.ok(match, `missing ${value} meta tag`);
  return entityDecode(match[1]);
}

test("homepage title names the product and matches social titles and the SPA", () => {
  const title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
  assert.equal(title, "Free Trade Calculators | Rough Logic");
  assert.equal(content("property", "og:title"), title);
  assert.equal(content("name", "twitter:title"), title);
  assert.match(app, /const HOME_TITLE = "Free Trade Calculators \| Rough Logic";/);
  assert.match(html, /<h1[^>]*>Free calculators for the trades\.<\/h1>/);
});

test("homepage uses one concise product pitch across search, social, structured, visible, and SPA copy", () => {
  const description = content("name", "description");
  assert.equal(
    description,
    "Get fast, source-backed answers from 2,262 free calculators for electrical, plumbing, HVAC, construction, and more.",
  );
  assert.equal(content("property", "og:description"), description);
  assert.equal(content("name", "twitter:description"), description);

  const jsonLd = JSON.parse(/<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html)?.[1]);
  assert.equal(jsonLd.find((row) => row["@type"] === "WebSite")?.description, description);

  const lede = /<p class="home-lede">([\s\S]*?)<\/p>/.exec(html)?.[1].replace(/\s+/g, " ").trim();
  assert.equal(lede, description);
  assert.ok(app.includes(JSON.stringify(description)), "SPA home description differs from the page pitch");
});

test("runtime integrity warning is excluded from search snippets", () => {
  assert.match(integrity, /banner\.setAttribute\("data-nosnippet",\s*""\)/);
});
