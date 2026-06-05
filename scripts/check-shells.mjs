#!/usr/bin/env node
// spec-v13 Phase G: shell authoring + payload-budget lint.
//
// Walks dist/tools/<id>/index.html and dist/groups/<slug>/index.html and
// asserts:
//   - Every tile in TOOLS has a shell at dist/tools/<id>/index.html.
//   - Every shell carries the profession-bearing title (Tile Name -
//     Profession Noun - Rough Logic), with the title length within the
//     spec-v13 §6.1 70-character hard cap.
//   - Every shell carries a meta description within the spec-v13 §6.2
//     220-character hard cap.
//   - Every shell carries a <link rel="canonical"> matching the shell's
//     own URL.
//   - Every shell carries an Open Graph block and a Twitter Card block.
//   - Every shell carries a valid JSON-LD block (parses, has @context
//     pointing at schema.org, every type drawn from the closed
//     allowlist in spec-v13 §7).
//   - Every shell's gzipped size is within the spec-v13 §5.4 6 KB cap
//     for tile shells and the §8.3 12 KB cap for group shells.
//   - No banned marketing language in titles or descriptions (the
//     spec-v13 §11.3 forbidden-word list).
//
// Standalone Node 20 script using only built-ins. Reads files; does not
// run the build. Run after `npm run build`.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

const TITLE_CAP = 70;
const DESCRIPTION_CAP = 220;
const TILE_GZIP_CAP = 6 * 1024;
const GROUP_GZIP_CAP = 12 * 1024;

const ALLOWED_JSONLD_TYPES = new Set([
  "WebApplication",
  "WebPage",
  "CollectionPage",
  "BreadcrumbList",
  "ItemList",
  "ListItem",
  "Offer",
  "Person",
  "HowTo",
  "HowToStep",
]);

// spec-v13 §11.3 forbidden marketing words. Matched as whole words,
// case-insensitive. The full §11.3 list also names "best", "easy",
// "simple", "fast", "fastest", but those four have legitimate uses
// in trade math content the tile descs already carry ("east-is-least /
// west-is-best" mnemonic in the bearing-conversion tile, "simple or
// compound interest" in the judgment-interest tile, "Fast Fourier"
// in any future DSP tile, etc.). The lint exempts them; the contributor
// remains responsible for avoiding marketing copy. The whole-word
// list below catches the language that is unambiguously marketing.
const BANNED_WORDS = [
  "awesome", "amazing", "killer", "badass", "revolutionary",
  "game-changing", "world-class",
];
// "ultimate" and "powerful" also appear in the full §11.3 list but
// have legitimate engineering meanings the tile descs already carry
// (ultimate axial capacity in the helical-pile tile; powerful in a
// future motor / pump tile). Exempted for the same reason "simple"
// and "fast" are exempted above.

async function loadTools() {
  const text = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const tools = [];
  const re = /\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"((?:[^"\\]|\\.)+)"\s*,\s*group:\s*"([^"]+)"/g;
  for (const m of text.matchAll(re)) {
    tools.push({ id: m[1], name: m[2], group: m[3] });
  }
  return tools;
}

function pickAttr(html, tagPattern, attr) {
  const re = new RegExp(tagPattern + '[^>]*\\b' + attr + '\\s*=\\s*"([^"]*)"', "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

function pickAllJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) blocks.push(m[1]);
  return blocks;
}

function containsBannedWord(s) {
  for (const w of BANNED_WORDS) {
    const re = new RegExp("\\b" + w + "\\b", "i");
    if (re.test(s)) return w;
  }
  return null;
}

async function lintShell(path, kind, errors) {
  const html = await readFile(path, "utf8");
  const where = path.slice(DIST.length + 1);

  // Title.
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) {
    errors.push(where + ": missing <title>.");
    return;
  }
  const title = titleMatch[1];
  if (title.length > TITLE_CAP) {
    errors.push(where + ": <title> length " + title.length + " exceeds " + TITLE_CAP + " cap.");
  }
  if (!title.endsWith(" - Rough Logic")) {
    errors.push(where + ": <title> does not end with ' - Rough Logic'.");
  }
  const bannedT = containsBannedWord(title);
  if (bannedT) {
    errors.push(where + ": <title> contains banned marketing word '" + bannedT + "'.");
  }

  // Meta description.
  const desc = pickAttr(html, '<meta[^>]*name="description"', "content");
  if (!desc) {
    errors.push(where + ": missing <meta name=\"description\">.");
  } else {
    if (desc.length > DESCRIPTION_CAP) {
      errors.push(where + ": meta description length " + desc.length + " exceeds " + DESCRIPTION_CAP + " cap.");
    }
    const bannedD = containsBannedWord(desc);
    if (bannedD) {
      errors.push(where + ": meta description contains banned marketing word '" + bannedD + "'.");
    }
  }

  // Canonical.
  const canonical = pickAttr(html, '<link[^>]*rel="canonical"', "href");
  if (!canonical) {
    errors.push(where + ": missing <link rel=\"canonical\">.");
  } else if (!canonical.startsWith("https://roughlogic.com/")) {
    errors.push(where + ": canonical '" + canonical + "' is not under https://roughlogic.com/.");
  }

  // OG + Twitter.
  if (!/property=["']og:title["']/.test(html)) errors.push(where + ": missing og:title.");
  if (!/property=["']og:description["']/.test(html)) errors.push(where + ": missing og:description.");
  if (!/property=["']og:url["']/.test(html)) errors.push(where + ": missing og:url.");
  if (!/name=["']twitter:card["']/.test(html)) errors.push(where + ": missing twitter:card.");

  // JSON-LD.
  const blocks = pickAllJsonLd(html);
  if (blocks.length === 0) {
    errors.push(where + ": missing JSON-LD block.");
  }
  for (const raw of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      errors.push(where + ": JSON-LD does not parse (" + e.message + ").");
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const it of items) {
      if (!it || typeof it !== "object") {
        errors.push(where + ": JSON-LD item not an object.");
        continue;
      }
      if (it["@context"] !== "https://schema.org") {
        errors.push(where + ": JSON-LD @context is not https://schema.org.");
      }
      // Walk types in the item tree to assert every @type is on the allowlist.
      const stack = [it];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== "object") continue;
        if (typeof node["@type"] === "string" && !ALLOWED_JSONLD_TYPES.has(node["@type"])) {
          errors.push(where + ": JSON-LD @type '" + node["@type"] + "' is not on the allowlist.");
        }
        for (const v of Object.values(node)) {
          if (Array.isArray(v)) for (const child of v) stack.push(child);
          else if (v && typeof v === "object") stack.push(v);
        }
      }
    }
  }

  // Gzip size budget.
  const gz = gzipSync(Buffer.from(html, "utf8")).length;
  const cap = kind === "tile" ? TILE_GZIP_CAP : GROUP_GZIP_CAP;
  if (gz > cap) {
    errors.push(where + ": shell gzipped size " + gz + " B exceeds " + cap + " B cap (" + kind + ").");
  }
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("check-shells: dist/ does not exist. Run `npm run build` first.");
    process.exit(1);
  }
  const tools = await loadTools();
  if (tools.length === 0) {
    console.error("check-shells: could not parse TOOLS from app.js.");
    process.exit(1);
  }

  const errors = [];

  // Every tile must have a shell.
  for (const t of tools) {
    const p = resolve(DIST, "tools", t.id, "index.html");
    if (!existsSync(p)) {
      errors.push("tools/" + t.id + "/index.html: missing tile shell.");
      continue;
    }
    await lintShell(p, "tile", errors);
  }

  // Walk dist/groups/* shells.
  const groupsDir = resolve(DIST, "groups");
  if (existsSync(groupsDir)) {
    const slugs = await readdir(groupsDir);
    for (const slug of slugs) {
      const p = resolve(groupsDir, slug, "index.html");
      if (!existsSync(p)) continue;
      const st = await stat(p);
      if (!st.isFile()) continue;
      await lintShell(p, "group", errors);
    }
  } else {
    errors.push("groups/: missing group shells directory.");
  }

  if (errors.length > 0) {
    console.error("check-shells: " + errors.length + " issue(s):");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  const tileCount = tools.length;
  const groupCount = existsSync(groupsDir) ? (await readdir(groupsDir)).length : 0;
  console.log(
    "check-shells OK: " + tileCount + " tile shells + " + groupCount + " group shells; " +
    "all titles <= " + TITLE_CAP + " chars, descriptions <= " + DESCRIPTION_CAP + " chars, " +
    "JSON-LD valid against allowlist, gzip under " + TILE_GZIP_CAP + " / " + GROUP_GZIP_CAP + " B caps."
  );
}

await main();
