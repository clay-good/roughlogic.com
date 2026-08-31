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
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

const TITLE_CAP = 70;
const DESCRIPTION_CAP = 220;
const TILE_GZIP_CAP = 6 * 1024;
// spec-v13 §8.3 group-shell cap. Bumped 12 -> 14 KB on 2026-06-24: the
// spec-v179..v187 electrician batch took Group A (Electrical) to 90 tiles, and
// the group hub lists every tile, taking electrical/index.html to ~12.6 KB gz
// (the largest group hub); 14 KB restored ~10% headroom for further Group A growth.
// Bumped 14 -> 17 KB on 2026-06-30: the spec-v230..v232 + v236..v238 energy-cost
// batch added 6 more Group A tiles, taking electrical/index.html to ~15.2 KB gz;
// 17 KB restores ~12% headroom for further Group A growth.
// Bumped 17 -> 20 KB on 2026-07-02: the spec-v242..v268 building-code / steel /
// concrete batches grew Group E (Construction) past Group A as the largest hub;
// the v257..v259 reinforced-concrete trio took construction/index.html to
// ~17.8 KB gz; 20 KB restores ~12% headroom for further Group E growth.
// Bumped 20 -> 24 KB later on 2026-07-02: the geotech (v260..v262), masonry
// (v269..v271), and wood-lateral (v272..v274) trios -- all Group E -- took
// construction/index.html to ~20.5 KB gz; 24 KB restores ~17% headroom.
// Bumped 24 -> 30 KB on 2026-07-03: the v275-v374 campaign's Group E depth
// trios (steel v281/v293, concrete v284, geotech v287, wood v290) took
// construction/index.html to ~24.7 KB gz; 30 KB restores ~21% headroom for
// the campaign's remaining Group E batches.
// Bumped 30 -> 34 KB on 2026-07-03: the wood-fastener withdrawal (v332..v334)
// and roadway geometric-design (v335..v337) Group E trios took
// construction/index.html to ~30.2 KB gz; 34 KB restores ~13% headroom.
// Bumped 34 -> 36 KB on 2026-07-04: the v375-v474 campaign's Group E
// concrete/seismic trios (v381..v383 seismic, v393..v395 concrete
// design-details) took construction/index.html just past 34 KB gz; 36 KB
// restores headroom for the remaining Group E batches in the backlog.
// Bumped 36 -> 39 KB on 2026-07-04: continued Group E landings this campaign
// (concrete field-work, finish-carpentry takeoff) took construction/index.html
// past 36 KB gz; 39 KB restores headroom for the remaining Group E batches.
// Bumped 39 -> 42 KB on 2026-07-04: the v375-v474 campaign close (fabrication
// weld/bend, powered-attic-ventilator, ASCE 7 snow trio, ADA ramp) took
// construction/index.html to ~40.1 KB gz; 42 KB restores headroom.
// Bumped 42 -> 48 KB on 2026-07-10: the v489-v588 single-tile campaign's
// Group E structural singles (steel-floor-vibration v547,
// concrete-anchor-breakout v548, diaphragm-collector-force v549, and the
// rigging / concrete / snow tiles through v556) took
// construction/index.html to ~43.4 KB gz, crossing the cap at v547 (this
// gate runs only in CI's integration job, so push lint stayed green while
// CI went red from v547 onward); 48 KB restores ~11% headroom.
// Bumped 48 -> 52 KB on 2026-07-13: the v664-v684 inverse-tile campaign added
// Group E construction inverses (hoop-stress-mawp v668, thermal-stress-max-deltat
// v674, helical-pile-torque v681), taking construction/index.html to ~48.2 KB gz
// and crossing the cap at v681 (again CI-only, so push lint stayed green while CI
// went red from v681 onward); 52 KB restores ~8% headroom.
// Bumped 52 -> 54 KB on 2026-07-14: spec-v793 fresh-concrete-temp (Group E concrete)
// added a bidirectional related-tiles chip to the construction group members, taking
// construction/index.html to ~52.2 KB gz (over the 52 KB cap); 54 KB restores ~3.5% headroom.
// Bumped 54 -> 56 KB on 2026-07-15: spec-v803 asce-live-load-reduction (Group E ASCE 7)
// took construction/index.html to ~54.1 KB gz (over the 54 KB cap); 56 KB restores ~3.4% headroom.
// Bumped 56 -> 60 KB on 2026-07-16: the spec-v809-v820 construction-ops spec-landing batch
// added 12 Group E tiles (loader/dozer/roller/ripper production, asphalt paving-speed/tack-coat,
// scaffold-mudsill, concrete-pour-rate, shotcrete, annular-grout, stockpile, welded-wire-mesh),
// taking construction/index.html to ~56.1 KB gz (over the 56 KB cap at welded-wire-mesh); 60 KB
// restores ~6.5% headroom for the campaign's remaining Group E landings (this gate runs only in
// CI's integration job, so push lint stays green while CI goes red -- run check-shells.mjs locally).
// Bumped 60 -> 64 KB on 2026-07-17: the spec-v831-v839 construction-ops landing batch added 9 Group E
// tiles (underground-utility trio, scaffold trio, dust-control-water, asphalt-spread-rate,
// pavement-milling-production, striping-paint-quantity), taking construction/index.html to ~60.1 KB gz
// (over the 60 KB cap at striping-paint-quantity); 64 KB restores ~6% headroom (this gate runs only in
// CI's integration job, so push lint stays green while CI goes red -- run check-shells.mjs locally).
// Bumped 64 -> 68 KB on 2026-07-17: the spec-v850-v865 construction-ops batch added ~11 more Group E tiles
// (shingle-nails, duct trio, roofing/insulation quartet, sheathing-takeoff), taking construction/index.html
// to ~64.2 KB gz (over the 64 KB cap at sheathing-takeoff); 68 KB restores ~6% headroom (this gate runs only
// in CI's integration job, so push lint stays green while CI goes red -- run check-shells.mjs locally).
// Bumped 68 -> 74 KB on 2026-07-17: the spec-v881-v883 construction-ops landings (baluster-picket-count,
// traffic-taper-length, siding-takeoff) took construction/index.html to ~68.2 KB gz (over the 68 KB cap at
// siding-takeoff); 74 KB restores ~8% headroom for the remaining v884-v908 Group E landings (this gate runs
// only in CI's integration job, so push lint stays green while CI goes red -- run check-shells.mjs locally).
// Bumped 74 -> 80 KB on 2026-07-18: the spec-v909+ post-construction-ops material/setup sweep Group E landings
// (curing-compound-coverage, concrete-isolation-joint, cement-board-takeoff, stud-notch-bore-limit, ...) took
// construction/index.html to ~74.1 KB gz (over the 74 KB cap at stud-notch-bore-limit); 80 KB restores headroom for
// the sweep's remaining Group E tiles (this gate runs only in CI's integration job -- run check-shells.mjs locally).
// Bumped 80 -> 84 KB on 2026-07-27: the spec-v1016/v1017 earth-pressure landings
// (seismic-earth-pressure, cohesive-earth-pressure) took construction/index.html to ~80.3 KB gz (over
// the 80 KB cap at cohesive-earth-pressure); 84 KB restores ~5% headroom (this gate runs only in CI's
// integration job, so push lint stays green while CI goes red -- run check-shells.mjs locally).
// spec-v1102 2026-07-27 (84 -> 88 KB): the Group E construction hub crossed 84 KB at 86,158 B as the
// +100 campaign added corner-bead, siding-course, snow-guard, and advance-warning-sign tiles. This gate
// is CI-only (not in `npm run lint`), so run `npm run check:shells` locally per Group-E tile.
const GROUP_GZIP_CAP = 68 * 1024; // 2026-08-16 (116->68 KB, a REDUCTION): group
// hubs stopped rendering each tile's full description and now render its
// opening sentence trimmed to 150 chars, so the largest hub (Group E
// construction) fell from 114,833 B gz to 53,704 B. The cap had been raised
// six times chasing that growth and no longer bounded anything; 68 KB restores
// ~27% headroom over the real maximum so it is a live budget again. Prior
// history follows. // spec-v1329 2026-08-13 (112->116 KB): the Group E construction hub reached 114,833 B gz after the v1327/v1328 windrow + flat-top stockpile tiles landed (this gate was skipped on those pushes because the integration job's e2e step failed first and stopped the job); raised with tail headroom. Group shells are pre-rendered HTML, not in the app payload. // spec-v1177 2026-07-28 (100->112 KB): the Group E construction hub crossed 102,658 B gz as the ADA batch added its tenth construction tile; raised with tail headroom. Group shells are pre-rendered HTML, not in the app payload. // spec-v1147 2026-07-28 (92->100 KB): the Group E construction hub crossed 94,345 B gz as the +100 campaign added its 11th construction tile; raised with tail headroom. Group shells are pre-rendered HTML, not in the app payload. // spec-v1126 2026-07-27 (88->92 KB) // earlier: 84->88 KB

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

// The CSP the shells carry. It is deliberately STRICTER than the edge policy in
// _headers: a shell ships zero JavaScript, so it needs neither the inline
// boot-script hash nor the Turnstile origins the SPA's policy allows. A page
// with no script has no business permitting one.
//
// `check-csp` pins the other two copies -- the <meta> in index.html and the
// edge header -- and never looks at these, which is a third hand-maintained
// copy across 1,804 pages. What matters is not that the string never changes
// but that it never WEAKENS, so the directives that would matter are asserted
// by name rather than by comparing the whole policy.
const SHELL_CSP_REQUIRED = [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];
// Any of these in a shell's script-src would let a page that runs no script of
// its own run someone else's.
const SHELL_CSP_FORBIDDEN = [/'unsafe-inline'/, /'unsafe-eval'/, /\*/, /https?:/];

function lintShellCsp(html, where, errors) {
  const meta = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (!meta) {
    errors.push(where + ": no Content-Security-Policy meta. Shells carry their own, stricter than the edge header.");
    return;
  }
  // The policy is full of single quotes (`'self'`, `'none'`), so a character
  // class of ["'] terminates on the first one inside a double-quoted attribute
  // and reports a policy that looks empty. Match the delimiter explicitly.
  const content = (meta[0].match(/content="([^"]*)"/i) || meta[0].match(/content='([^']*)'/i) || [])[1] || "";
  for (const directive of SHELL_CSP_REQUIRED) {
    if (!content.includes(directive)) {
      errors.push(where + ": shell CSP is missing `" + directive + "`.");
    }
  }
  const scriptSrc = (content.match(/script-src([^;]*)/) || [])[1] || "";
  for (const bad of SHELL_CSP_FORBIDDEN) {
    if (bad.test(scriptSrc)) {
      errors.push(where + ": shell CSP script-src has been weakened (" + bad + " in `script-src" + scriptSrc + "`). A shell runs no script of its own.");
    }
  }
}

// docs/threat-model.md: "Shells carry zero JavaScript. No <script> tag on any
// shell beyond the inline <script type=\"application/ld+json\"> block, which is
// a non-executable data block per the HTML spec. The TBT for every shell is 0 ms
// by construction."
//
// "By construction" was the whole argument, and nothing checked the
// construction. The JSON-LD is parsed here for validity, so an executable
// <script> would have slipped past that reader untouched -- and taken the zero
// -TBT claim and the shells' stricter CSP rationale with it.
function lintShellNoScript(html, where, errors) {
  for (const m of html.matchAll(/<script([^>]*)>/gi)) {
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(m[1])) continue;
    errors.push(where + ": carries an executable <script" + m[1] + ">. Shells ship zero JavaScript (docs/threat-model.md).");
  }
}

async function lintShell(path, kind, errors) {
  const html = await readFile(path, "utf8");
  const where = path.slice(DIST.length + 1);
  lintShellCsp(html, where, errors);
  lintShellNoScript(html, where, errors);

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

  // spec-v45: every tile shell prerenders the cited formula + source-stamp so
  // crawlers (and offline readers) get the reference content, not just the tile
  // name. It rides in a collapsed <details> so the page still reads as
  // title -> example -> answer, with the receipts one click away.
  //
  // ONE disclosure per page, holding all of it: scope prose, formula, sources,
  // assumptions. A second <details> would put the same reference material
  // behind two clicks in two places, so the count is pinned at exactly one.
  if (kind === "tile") {
    if (!/aria-label="Details, formula, and sources"/.test(html)) {
      errors.push(where + ": missing the 'Details, formula, and sources' section (spec-v45 prerendered citation).");
    }
    if (!/class="shell-formula"/.test(html) || !/class="shell-source"/.test(html)) {
      errors.push(where + ": 'Details, formula, and sources' section is missing the formula or source line.");
    }
    const disclosures = (html.match(/<details/g) || []).length;
    if (disclosures !== 1) {
      errors.push(where + ": " + disclosures + " <details> blocks; a tile shell gets exactly one.");
    }

    // A worked example whose every numeric answer is zero teaches nothing.
    // air-receiver -- a receiver SIZING tile -- printed "Receiver: 0 ft3";
    // traverse-closure printed 0.000 ft misclosure, which suppressed the 1:N
    // relative precision entirely; neutral-imbalance printed 0.0% imbalance
    // from a balanced load. Each was a correct result and a useless example.
    //
    // Only rows that parse as a number ON THEIR OWN count, so a reference
    // tile answering "AUGGCCUAA", "Level III", "high_cost" or a "2-4" range
    // is not mistaken for a zero. A tile with no numeric answer at all is not
    // judged here.
    const answers = answerRows(html);
    const nums = answers.map((a) => soleNumber(a.value)).filter((n) => n !== null);
    if (nums.length && nums.every((n) => n === 0)) {
      errors.push(where + ": every numeric answer in the worked example is zero (" +
        answers.map((a) => a.label + " = " + a.value).join("; ") +
        "). Show a case that exercises the tile.");
    }
    for (const a of answers) {
      if (!String(a.value).trim()) errors.push(where + ": worked-example answer '" + a.label + "' is blank.");
    }

    // 20 tiles take no inputs; their whole value is the table they print, and
    // until 2026-08-31 none of it reached the static page -- the shell was the
    // tile name and one sentence. The builder now renders what the tile
    // computes on no inputs, in three shapes (a string, a list of rows, a list
    // of rows carrying nested lists). A result shape it does not recognise
    // renders nothing, which looks exactly like the stub it replaced, so a
    // page with no example must carry a Reference section with rows in it.
    if (!/aria-label="Example"/.test(html)) {
      const ref = html.match(/aria-label="Reference"[\s\S]*?<\/section>/);
      const rows = ref ? (ref[0].match(/<li>/g) || []).length : 0;
      if (!ref) {
        errors.push(where + ": no worked example and no Reference section. A reference page must print its reference content.");
      } else if (rows < 2) {
        errors.push(where + ": Reference section renders " + rows + " row(s). The builder did not recognise this tile's result shape.");
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

// The "You get" rows of a tile shell, as { label, value }.
export function answerRows(html) {
  const block = html.match(/<p class="shell-io-label">You get<\/p>\s*<ul class="shell-io">([\s\S]*?)<\/ul>/);
  if (!block) return [];
  return [...block[1].matchAll(/<li><span>([^<]*)<\/span> <b>([^<]*)<\/b>/g)]
    .map((m) => ({ label: m[1], value: m[2] }));
}

// The number a printed answer IS, or null when it is not simply a number.
// "0.1" and "25.98 A" are numbers; "AUGGCCUAA", "Level III", "high_cost" and
// the range "2-4" are not, and must never be read as a zero.
export function soleNumber(value) {
  const t = String(value).trim();
  if (!/\d/.test(t)) return null;
  const m = t.match(/^[-+]?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?/);
  if (!m) return null;
  const rest = t.slice(m[0].length).trim();
  if (rest && /^[-+]?\d/.test(rest)) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
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

  // spec-v1345: the catalog hub at dist/tools/index.html. Linted under the
  // GROUP cap, not the tile cap -- it is a listing page like a group hub, not
  // a tile shell, and at 1,709 links it is legitimately the largest page on
  // the site. Without this it is the only shipped shell no gate watches.
  const toolsIndex = resolve(DIST, "tools", "index.html");
  if (existsSync(toolsIndex)) {
    await lintShell(toolsIndex, "group", errors);
  } else {
    errors.push("tools/index.html: missing catalog hub (spec-v1345).");
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

  // The sitemap and the shells are generated from the same TOOLS list, one
  // after the other, which is exactly the reasoning that let a tampered data
  // shard through: generated together is not the same as checked together. A
  // sitemap entry with no page behind it is a 404 handed to a crawler; a shell
  // missing from the sitemap is a page no crawler is told about. Both
  // directions, cheaply.
  let sitemapUrls = 0;
  const sitemapPath = resolve(DIST, "sitemap.xml");
  if (!existsSync(sitemapPath)) {
    errors.push("sitemap.xml: missing.");
  } else {
    const xml = await readFile(sitemapPath, "utf8");
    const locs = [...xml.matchAll(/<loc>https:\/\/roughlogic\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
    sitemapUrls = locs.length;
    const listed = new Set(locs);
    for (const loc of locs) {
      const file = resolve(DIST, ("." + (loc.endsWith("/") ? loc + "index.html" : loc)).replace(/^\.\//, ""));
      if (!existsSync(file)) errors.push("sitemap.xml lists " + loc + ", which has no page in dist/.");
    }
    for (const t of tools) {
      if (!listed.has("/tools/" + t.id + "/")) errors.push("tools/" + t.id + "/ is built but absent from sitemap.xml.");
    }
    if (!listed.has("/tools/")) errors.push("the catalog hub /tools/ is absent from sitemap.xml.");
    if (existsSync(groupsDir)) {
      for (const slug of await readdir(groupsDir)) {
        if (!existsSync(resolve(groupsDir, slug, "index.html"))) continue;
        if (!listed.has("/groups/" + slug + "/")) errors.push("groups/" + slug + "/ is built but absent from sitemap.xml.");
      }
    }
  }

  if (errors.length > 0) {
    console.error("check-shells: " + errors.length + " issue(s):");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  const tileCount = tools.length;
  const groupCount = existsSync(groupsDir) ? (await readdir(groupsDir)).length : 0;
  console.log(
    "check-shells OK: " + tileCount + " tile shells + " + groupCount + " group shells + 1 catalog hub; " +
    "all titles <= " + TITLE_CAP + " chars, descriptions <= " + DESCRIPTION_CAP + " chars, " +
    "JSON-LD valid against allowlist, gzip under " + TILE_GZIP_CAP + " / " + GROUP_GZIP_CAP + " B caps, " +
    "every shell CSP present and unweakened, no executable script on any shell, " +
    "every page without a worked example printing its reference content, and " +
    sitemapUrls + " sitemap URLs matched one-for-one against the built pages."
  );
}

// Run the sweep only when this file IS the command, not when a test imports
// `answerRows` / `soleNumber` from it. `await main()` at module scope used to
// fire on import, and main() exits 1 when dist/ is missing -- which is the
// normal state in CI's `test` job, since that job runs the unit tests BEFORE
// the build. The gate passed locally (a dist/ was lying around) and failed on
// the runner.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
