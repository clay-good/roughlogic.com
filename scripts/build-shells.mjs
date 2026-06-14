#!/usr/bin/env node
// spec-v13 Phase A + D + F: per-tile and per-group prerendered HTML shells
// + sitemap expansion.
//
// Reads TOOLS and GROUP_NAMES from app.js (the same authoritative source the
// SPA uses), emits one HTML shell per tile under `dist/tools/<id>/index.html`
// and one per group under `dist/groups/<slug>/index.html`, and regenerates
// `dist/sitemap.xml` to enumerate every shell URL. Phases B (authoring),
// C (JSON-LD), E (related-tiles graph from tile-meta), G (authoring lint),
// and H (shell-size budget lint) follow in subsequent commits.
//
// Pure: no network, no async beyond file I/O, deterministic for a given
// TOOLS + GROUP_NAMES input. The SPA at the home URL is unchanged; shells
// are static reference pages that link back to the SPA via the existing
// hash route (e.g., /#wire-ampacity).
//
// Hard limits preserved per spec-v13 §1: no new third-party dependency,
// CSP `default-src 'self'` inherited via the same `<meta http-equiv>` tag
// the home document carries, no JavaScript loaded by the shell (zero TBT),
// no telemetry, no third-party fetch.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CITATIONS } from "../citations.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://roughlogic.com";

// Maps the first entry in a tile's `trades` array to the profession noun
// rendered in the shell `<title>`. Spec-v13 §11.2: titles carry the
// profession noun so a search query that names a generic trade
// ("electrician calculator") matches.
const PROFESSION_NOUN = {
  electrical: "Electricians",
  plumbing: "Plumbers",
  hvac: "HVAC",
  restoration: "Restoration",
  carpentry: "Carpentry",
  fire: "Fire-ground",
  trucking: "Truckers",
  mechanic: "Mechanics",
  agriculture: "Agriculture",
  water: "Water Operators",
  stage: "Stage and Live Production",
  kitchen: "Kitchen",
  field: "Field and SAR",
  reference: "Trades",
  accounting: "Accounting",
  "small-business": "Small Business",
  tax: "Tax",
  legal: "Legal",
  lab: "Laboratory",
  compliance: "Compliance",
  vet: "Veterinary",
  ems: "EMS",
  aviation: "Pilots",
  realestate: "Real Estate",
  edu: "Educators",
};

// Group slug used in `/groups/<slug>/index.html`. Spec-v13 §8.1.
const GROUP_SLUG = {
  A: "electrical",
  B: "plumbing",
  C: "hvac",
  D: "restoration",
  E: "construction",
  F: "fire-ground",
  G: "cross-trade",
  H: "references",
  J: "trucking",
  K: "mechanic",
  L: "agriculture",
  M: "water",
  N: "stage",
  O: "kitchen",
  P: "field",
  Q: "historical",
  R: "accounting",
  S: "legal",
  T: "lab",
  U: "veterinary",
  V: "ems",
  W: "aviation",
  X: "real-estate",
  Y: "educators",
  Z: "rigging-and-heavy-lift",
};

// Escape a string for embedding inside HTML text content or an attribute.
// The shells embed only the tile name, the description, and the group
// label, all of which the existing grep-checks lint already screens for
// banned glyphs (emoji, em-dash). The escape here is the standard XSS-
// hardening pass that every static-site generator runs.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Parse the TOOLS array out of tools-data.js by regex (spec-v17 §H.2
// extracted the catalog registry out of app.js into a lazy-loaded
// tools-data.js). Matches the same shape scripts/check-tile-meta.mjs
// already parses, extended with the `trades` array and the `desc`
// string. Returns an array of { id, name, group, trades, desc }.
async function loadTools() {
  const text = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const tools = [];
  const re = /\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"((?:[^"\\]|\\.)+)"\s*,\s*group:\s*"([^"]+)"\s*,\s*trades:\s*\[([^\]]*)\]\s*,\s*desc:\s*"((?:[^"\\]|\\.)+)"\s*\}/g;
  for (const m of text.matchAll(re)) {
    const trades = [...m[4].matchAll(/"([^"]+)"/g)].map((tm) => tm[1]);
    tools.push({
      id: m[1],
      name: m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
      group: m[3],
      trades,
      desc: m[5].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    });
  }
  return tools;
}

// Parse the GROUP_NAMES object out of app.js. Matches the const declaration
// and extracts the letter -> display name pairs.
async function loadGroupNames() {
  const text = await readFile(resolve(ROOT, "app.js"), "utf8");
  const m = text.match(/const\s+GROUP_NAMES\s*=\s*\{([\s\S]*?)\n\};/);
  if (!m) throw new Error("build-shells: could not parse GROUP_NAMES from app.js");
  const out = {};
  for (const row of m[1].matchAll(/\b([A-Z]):\s*"((?:[^"\\]|\\.)+)"/g)) {
    out[row[1]] = row[2].replace(/\\"/g, '"');
  }
  return out;
}

// One-line shell description expanded from the tile's `desc` field per
// spec-v13 §11.1 (verb-first, names the calculation and the inputs).
// The desc fields in TOOLS already begin with a verb in the great
// majority of cases ("Compute", "Estimate", "Convert", "Look up",
// "Decode"); the small set that start with a noun get a "Reference for"
// prefix so the search snippet leads with the verb.
// Build a meta description that stays within the spec-v13 §6.2 / Phase
// G 220-character hard cap measured *after HTML escaping* (the value
// the search-engine snippet reads is the escaped attribute string).
// Verb-first prefix per §11.1; tiles whose `desc` does not lead with
// an admissible verb get a "Reference for" prefix so the snippet reads
// as a verb-first sentence.
function metaDescription(tool, professionNoun) {
  const verb = /^(Compute|Estimate|Convert|Look up|Decode|Plain|Determine|Find|Calculate|Size|Solve|Output|Resolve|Standard|Quick|Plain-English|Plain English|Read|Show|Return|List|Build|Render|Tabulate|Map|Score|Rate|Predict|Project|Sketch|Sketches|Lookup)\b/i;
  let lead = tool.desc.trim();
  if (!verb.test(lead)) {
    lead = "Reference for " + lead.charAt(0).toLowerCase() + lead.slice(1);
  }
  if (!lead.endsWith(".")) lead += ".";
  const tail = "Client-side, ad-free, account-free reference for " + professionNoun.toLowerCase() + ".";
  let combined = lead + " " + tail;
  // Truncate against the escaped length so the value the lint reads
  // out of the rendered <meta content="..."> stays under the cap.
  while (escapeHtml(combined).length > 220 && combined.length > 10) {
    combined = combined.slice(0, -4) + "...";
    // Strip the ".." we just appended on the next pass; the slice loop
    // converges as long as it shaves at least one raw character per
    // iteration.
    combined = combined.replace(/\.\.\.+$/, "...");
  }
  return combined;
}

// Build a shell title with the spec-v13 §11.2 profession noun, falling
// back to a shorter form if the full "{Name} - {Profession Noun} -
// Rough Logic" exceeds the §6.1 70-character cap. The fallback order
// preserves the tile name (which the user is searching for) and the
// brand suffix (which establishes site identity); the profession noun
// is the optional middle that gets dropped first.
function buildTitle(tool, professionNoun, capChars) {
  const brand = " - Rough Logic";
  const middle = " - " + professionNoun;
  const full = tool.name + middle + brand;
  if (full.length <= capChars) return full;
  const noProf = tool.name + brand;
  if (noProf.length <= capChars) return noProf;
  // Truncate the tile name only if both fallbacks still overflow. Keep
  // " - Rough Logic" so the brand is preserved.
  const headRoom = capChars - brand.length - 3;
  if (headRoom < 4) return tool.name + brand;
  return tool.name.slice(0, headRoom) + "..." + brand;
}

// Pick 3-6 related tiles per spec-v13 §5.2 + §9.1. When the per-tile
// related-tiles registry in scripts/related-tiles.mjs has entries for
// the tile, those entries win and are rendered in the order the
// registry records (the editorial cross-references that the citation
// graph + worked-example narratives already imply). When the registry
// has no entries (the default for the long tail), fall back to "the
// first 5 other tiles in the same group, by TOOLS order".
function relatedTiles(tool, tools, related) {
  const curated = related && Array.isArray(related[tool.id]) ? related[tool.id] : [];
  if (curated.length > 0) {
    const byId = new Map(tools.map((t) => [t.id, t]));
    const out = [];
    for (const id of curated) {
      const t = byId.get(id);
      if (t) out.push(t);
    }
    if (out.length > 0) return out;
  }
  return tools
    .filter((t) => t.group === tool.group && t.id !== tool.id)
    .slice(0, 5);
}

// spec-v13 Phase C: JSON-LD structured data block. Returns the
// <script type="application/ld+json"> ... </script> string for a
// tile shell or a group shell. Closed allowlist of schema.org types:
// WebApplication (or WebPage), BreadcrumbList, CollectionPage,
// ItemList. No HowTo in Phase C (HowTo requires per-tile input
// schemas the registry does not yet carry); deferred to a follow-up
// once tile-meta.js carries the per-tile input list. No Review,
// AggregateRating, FAQPage, JobPosting, Recipe, or Course types.
function jsonLdBlock(items) {
  const safe = JSON.stringify(items)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return '<script type="application/ld+json">' + safe + '</script>';
}

function tileJsonLd(tool, groupLabel, groupSlug, title, description, canonical) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name,
      description,
      url: canonical,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (browser)",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Person",
        name: "Clay Good",
        url: "https://claygood.com",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: groupLabel, item: SITE_URL + "/groups/" + groupSlug + "/" },
        { "@type": "ListItem", position: 3, name: tool.name, item: canonical },
      ],
    },
  ];
}

function groupJsonLd(groupLabel, groupSlug, tilesInGroup, title, description, canonical) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: canonical,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: groupLabel, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      numberOfItems: tilesInGroup.length,
      itemListElement: tilesInGroup.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: SITE_URL + "/tools/" + t.id + "/",
      })),
    },
  ];
}

function shellHead({ title, description, canonical, ogType, ogImage }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\'; form-action \'self\'; base-uri \'self\'; object-src \'none\'; worker-src \'self\'">',
    '<meta name="referrer" content="no-referrer">',
    '<meta name="robots" content="index,follow">',
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:type" content="${escapeHtml(ogType)}">`,
    `<meta property="og:site_name" content="Rough Logic">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : null,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    '<meta name="color-scheme" content="dark light">',
    '<meta name="theme-color" content="#0a0a0a">',
  ].filter(Boolean).join("\n");
}

function shellStylesAndIcons(depth) {
  // depth = number of "../" segments to walk up to dist root.
  const prefix = "../".repeat(depth);
  return [
    `<link rel="stylesheet" href="${prefix}styles.css">`,
    `<link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">`,
  ].join("\n");
}

function shellHeader(depth) {
  const prefix = "../".repeat(depth);
  return [
    '<header class="site-header" role="banner">',
    '  <div class="header-inner">',
    `    <a class="brand" href="${prefix}" aria-label="Rough Logic home">`,
    '      <span class="wordmark">roughlogic</span>',
    '      <span class="tagline">tools for the trade.</span>',
    '    </a>',
    '  </div>',
    '</header>',
  ].join("\n");
}

function shellFooter() {
  return [
    '<footer class="site-footer" role="contentinfo">',
    '  <div class="footer-badges">',
    '    <a class="footer-badge" href="https://claygood.com" rel="noopener">',
    '      <span>Made with </span>',
    '      <span class="footer-badge-heart" aria-hidden="true">&#9829;</span>',
    '      <span> by Clay Good</span>',
    '    </a>',
    '    <a class="footer-badge" href="https://github.com/clay-good/roughlogic.com" rel="noopener">',
    '      <span>GitHub</span>',
    '    </a>',
    '  </div>',
    '  <p class="shell-disclaimer">This site is a math aid, not a code authority. The Authority Having Jurisdiction governs all installations and inspections. Where a tile concerns a regulated profession, the licensed professional governs the decision.</p>',
    '</footer>',
  ].join("\n");
}

function tileShell(tool, tools, groupNames, relatedMap) {
  const professionNoun = PROFESSION_NOUN[tool.trades[0]] || "Trades";
  const groupLabel = groupNames[tool.group] || tool.group;
  const groupSlug = GROUP_SLUG[tool.group] || tool.group.toLowerCase();
  const title = buildTitle(tool, professionNoun, 70);
  const description = metaDescription(tool, professionNoun);
  const canonical = `${SITE_URL}/tools/${tool.id}/`;
  const related = relatedTiles(tool, tools, relatedMap);
  // spec-v45: the cited formula + source-stamp, prerendered into the static
  // shell so the reference content crawlers index is the actual math, not just
  // the tile name. Every tile has a CITATIONS entry (the v19/v22 coverage gate).
  const citation = CITATIONS[tool.id] || null;
  const head = shellHead({
    title,
    description,
    canonical,
    ogType: "website",
  });
  const styles = shellStylesAndIcons(2);
  const jsonld = jsonLdBlock(tileJsonLd(tool, groupLabel, groupSlug, title, description, canonical));
  const header = shellHeader(2);
  const footer = shellFooter();
  const relatedItems = related.map((r) => (
    `      <li><a href="../${escapeHtml(r.id)}/">${escapeHtml(r.name)}</a></li>`
  )).join("\n");
  const body = [
    '<body class="shell-page">',
    header,
    '<main id="main" class="shell-main">',
    '  <nav class="shell-breadcrumb" aria-label="Breadcrumb">',
    '    <ol>',
    '      <li><a href="../../">Home</a></li>',
    `      <li><a href="../../groups/${escapeHtml(groupSlug)}/">${escapeHtml(groupLabel)}</a></li>`,
    `      <li aria-current="page">${escapeHtml(tool.name)}</li>`,
    '    </ol>',
    '  </nav>',
    `  <h1 class="shell-h1">${escapeHtml(tool.name)}</h1>`,
    `  <p class="shell-lead">${escapeHtml(tool.desc)}</p>`,
    '  <p class="shell-run">',
    `    <a class="shell-run-link" href="../../#${escapeHtml(tool.id)}">Run the calculator</a>`,
    '  </p>',
    citation ? [
      '  <section class="shell-section" aria-label="Formula and source">',
      '    <h2>Formula and source</h2>',
      `    <p class="shell-formula">${escapeHtml(citation.formula)}</p>`,
      `    <p class="shell-source">${escapeHtml(citation.edition)}</p>`,
      '  </section>',
    ].join("\n") : '',
    '  <section class="shell-section" aria-label="Audience">',
    '    <h2>Audience</h2>',
    `    <p>This tile is built for ${escapeHtml(professionNoun.toLowerCase())} and the adjacent professions in the ${escapeHtml(groupLabel)} group. The interactive calculator runs entirely in your browser. No account, no fee, no advertising, no tracking.</p>`,
    '  </section>',
    relatedItems ? [
      '  <section class="shell-section" aria-label="Related tiles">',
      '    <h2>Related tiles</h2>',
      '    <ul class="shell-related">',
      relatedItems,
      '    </ul>',
      '  </section>',
    ].join("\n") : '',
    '  <section class="shell-section" aria-label="Posture">',
    '    <h2>Posture</h2>',
    '    <p>Rough Logic answers the math question the working professional asks on the job. The site is a calm, fast, ad-free, account-free, ever-free reference. It does not interpret code. It does not replace the licensed professional. It does not store your inputs. The Authority Having Jurisdiction governs all installations and inspections.</p>',
    '  </section>',
    '</main>',
    footer,
    '</body>',
    '</html>',
    '',
  ].filter(Boolean).join("\n");
  return [head, styles, jsonld, '</head>', body].join("\n");
}

function groupShell(group, tools, groupNames) {
  const groupLabel = groupNames[group] || group;
  const groupSlug = GROUP_SLUG[group] || group.toLowerCase();
  const tilesInGroup = tools.filter((t) => t.group === group);
  if (tilesInGroup.length === 0) return null;
  const title = `${groupLabel} Calculators - Rough Logic`;
  const sample = tilesInGroup.slice(0, 3).map((t) => t.name).join(", ");
  let description = `Calculators and reference tiles for ${groupLabel.toLowerCase()}: ${sample}, and more. Free, client-side, ad-free, account-free reference for the trades and adjacent professions.`;
  if (description.length > 220) description = description.slice(0, 217) + "...";
  const canonical = `${SITE_URL}/groups/${groupSlug}/`;
  const head = shellHead({
    title,
    description,
    canonical,
    ogType: "website",
  });
  const styles = shellStylesAndIcons(2);
  const jsonld = jsonLdBlock(groupJsonLd(groupLabel, groupSlug, tilesInGroup, title, description, canonical));
  const header = shellHeader(2);
  const footer = shellFooter();
  const items = tilesInGroup.map((t) => (
    `      <li><a href="../../tools/${escapeHtml(t.id)}/">${escapeHtml(t.name)}</a><span class="shell-related-desc"> - ${escapeHtml(t.desc)}</span></li>`
  )).join("\n");
  const body = [
    '<body class="shell-page">',
    header,
    '<main id="main" class="shell-main">',
    '  <nav class="shell-breadcrumb" aria-label="Breadcrumb">',
    '    <ol>',
    '      <li><a href="../../">Home</a></li>',
    `      <li aria-current="page">${escapeHtml(groupLabel)}</li>`,
    '    </ol>',
    '  </nav>',
    `  <h1 class="shell-h1">${escapeHtml(groupLabel)}</h1>`,
    `  <p class="shell-lead">${escapeHtml(tilesInGroup.length)} calculators and reference tiles for ${escapeHtml(groupLabel.toLowerCase())}. Every tile runs entirely in your browser. No account. No fee. No advertising. No tracking.</p>`,
    `  <p class="shell-run"><a class="shell-run-link" href="../../#group=${escapeHtml(group)}">Open the live group view</a></p>`,
    '  <section class="shell-section" aria-label="Tiles in this group">',
    '    <h2>Tiles in this group</h2>',
    '    <ul class="shell-related">',
    items,
    '    </ul>',
    '  </section>',
    '</main>',
    footer,
    '</body>',
    '</html>',
    '',
  ].join("\n");
  return [head, styles, jsonld, '</head>', body].join("\n");
}

function buildSitemap(tools, groups, builtIso) {
  const lastmod = builtIso.slice(0, 10);
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  // Home.
  lines.push('  <url>');
  lines.push(`    <loc>${SITE_URL}/</loc>`);
  lines.push(`    <lastmod>${lastmod}</lastmod>`);
  lines.push('    <changefreq>weekly</changefreq>');
  lines.push('    <priority>1.0</priority>');
  lines.push('  </url>');
  // Changelog.
  lines.push('  <url>');
  lines.push(`    <loc>${SITE_URL}/changelog.html</loc>`);
  lines.push(`    <lastmod>${lastmod}</lastmod>`);
  lines.push('    <changefreq>weekly</changefreq>');
  lines.push('    <priority>0.5</priority>');
  lines.push('  </url>');
  // Groups.
  for (const g of groups) {
    const slug = GROUP_SLUG[g] || g.toLowerCase();
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}/groups/${slug}/</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.8</priority>');
    lines.push('  </url>');
  }
  // Tiles.
  for (const t of tools) {
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}/tools/${t.id}/</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.7</priority>');
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  lines.push('');
  return lines.join("\n");
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("build-shells: dist/ does not exist. Run `npm run build` first.");
    process.exit(1);
  }
  const tools = await loadTools();
  if (tools.length === 0) {
    console.error("build-shells: could not parse TOOLS from app.js.");
    process.exit(1);
  }
  const groupNames = await loadGroupNames();
  const groups = [...new Set(tools.map((t) => t.group))];

  // spec-v13 Phase E: import the per-tile related-tiles registry from
  // scripts/related-tiles.mjs (the build-time-only home for this map,
  // moved out of tile-meta.js on 2026-05-18 so the runtime tile-meta.js
  // stops growing with the editorial map). When the registry has
  // entries for a tile they win; otherwise build-shells.mjs falls back
  // to "first 5 in same group".
  const relatedMod = await import(resolve(ROOT, "scripts/related-tiles.mjs"));
  const relatedMap = relatedMod.RELATED || {};

  let shellCount = 0;
  // Per-tile shells.
  for (const tool of tools) {
    const html = tileShell(tool, tools, groupNames, relatedMap);
    const out = resolve(DIST, "tools", tool.id, "index.html");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html, "utf8");
    shellCount += 1;
  }
  // Per-group shells.
  let groupCount = 0;
  for (const g of groups) {
    const html = groupShell(g, tools, groupNames);
    if (!html) continue;
    const slug = GROUP_SLUG[g] || g.toLowerCase();
    const out = resolve(DIST, "groups", slug, "index.html");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html, "utf8");
    groupCount += 1;
  }

  // Regenerate sitemap.xml at dist/ root from the live TOOLS + groups.
  const stampPath = resolve(DIST, "build-info.json");
  let builtIso = new Date().toISOString();
  if (existsSync(stampPath)) {
    const text = await readFile(stampPath, "utf8");
    try {
      const j = JSON.parse(text);
      if (j && j.built) builtIso = j.built;
    } catch {
      // Fallthrough to now().
    }
  }
  const sitemap = buildSitemap(tools, groups, builtIso);
  await writeFile(resolve(DIST, "sitemap.xml"), sitemap, "utf8");

  console.log(
    "build-shells: " + shellCount + " tile shells, " +
    groupCount + " group shells, sitemap with " +
    (2 + groups.length + tools.length) + " URLs."
  );
}

await main();
