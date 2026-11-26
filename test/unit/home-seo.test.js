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

// A REMOVAL NEEDS A GUARD, OR IT COMES BACK -- THIS ONE ALREADY DID.
//
// spec-v475 records a deliberate deletion rather than a feature: the
// `.home-note` paragraph under the home lede that advertised the offline/PWA
// capability and the local MCP server. The maintainer removed it on purpose,
// and it "was later restored by mistake while chasing an apparent regression",
// which is why the spec exists -- its stated purpose is that the removal "is
// not 'restored' again".
//
// Nothing enforced that. A removal is the one kind of landed change no code can
// name, so it was also the single LANDED spec with no anchor anywhere in the
// tree, and the only thing standing between the blurb and a third appearance
// was that nobody had reached for it. The capabilities themselves are
// unchanged and still documented in the README and the MCP docs; it is the
// home-page callout that stays gone.
test("spec-v475: the offline/PWA and MCP home-page blurb stays removed", () => {
  assert.doesNotMatch(html, /home-note/, "the .home-note element must not return to index.html");
  // The copy itself, in case it comes back under another class or none.
  for (const phrase of [
    "Works offline",
    "install it as an app",
    "keeps running with the network off",
    "local MCP server",
  ]) {
    assert.ok(!html.includes(phrase), `index.html must not carry the removed blurb's copy: "${phrase}"`);
  }
  // The home lede is still there, so this is not passing because the page is
  // empty or the fixture failed to load.
  assert.match(html, /Free calculators for the trades\./, "the home H1 is still present");
});

test("spec-v1851: homepage uses one concise product pitch across search, social, structured, visible, and SPA copy", () => {
  const description = content("name", "description");
  assert.equal(
    description,
    "Get fast, source-backed answers from 2,288 free calculators for electrical, plumbing, HVAC, construction, and more.",
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
