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
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadLedger } from "./build-page-lastmod.mjs";
import { CITATIONS } from "../citations.js";
import { leadSentence, restOfDescription } from "../text-lead.js";
import { normalizeQuery, rankTools } from "../search-discovery.js";

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
export const GROUP_SLUG = {
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

// A group hub lists every tile in the group, so each row has to stay one
// scannable line even when the tile's opening sentence runs long (these pack
// clauses behind colons and semicolons and reach 370 characters). Trim to a
// word boundary; the full description is on the tile page the row links to.
const GROUP_ROW_CAP = 150;
function rowSummary(desc) {
  const s = leadSentence(desc);
  if (s.length <= GROUP_ROW_CAP) return s;
  const cut = s.slice(0, GROUP_ROW_CAP);
  const sp = cut.lastIndexOf(" ");
  return (sp > 60 ? cut.slice(0, sp) : cut).replace(/[.,;:\s-]+$/, "") + "...";
}

// Load the worked-example registry (test/fixtures/worked-examples.json) and
// index it by tile id. Every tile carries at least one verified row -- the
// check-worked-examples lint is fail-on-missing -- so the shell can print the
// exact inputs a reader types and the exact outputs they get back, instead of
// describing the calculation in the abstract. Keyed to the first row per tile.
export async function loadWorkedExamples() {
  const raw = JSON.parse(await readFile(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const rows = Array.isArray(raw) ? raw : (raw.examples || raw.rows || []);
  const byTile = new Map();
  for (const row of rows) {
    if (row && row.tile_id && !byTile.has(row.tile_id)) byTile.set(row.tile_id, row);
  }
  await addComputedExamples(byTile);
  return byTile;
}

// One tile's registry row is a WIRING STUB by design, and the page paid for it.
//
// `magnetic-declination` computes from the World Magnetic Model, which means
// reading a 12-degree coefficient table -- asynchronous, and the worked-example
// runner is synchronous, so its fixture declares the model id rather than a
// declination. That is the right call for the runner (numerical correctness is
// proven separately against all 100 NCEI WMM2025 test vectors). It is the wrong
// outcome for the page: with no inputs in the fixture, the one calculator whose
// answer a reader most needs to see demonstrated printed no example at all, and
// its call-to-action read "Open the reference" as though it had nothing to
// compute.
//
// So the page's example is computed HERE, at build time, from the same bundled
// coefficients the browser reads, using the tile's own published example
// inputs. Nothing is hard-coded: when the model is refreshed, this example
// refreshes with it. If anything fails, the page falls back to what it does
// today rather than printing a number nobody checked.
async function addComputedExamples(byTile) {
  try {
    const { computeWMM, magneticDeclinationExample } = await import(new URL("../calc-field.js", import.meta.url).href);
    const coefficients = JSON.parse(await readFile(resolve(ROOT, "data/field/wmm/coefficients.json"), "utf8"));
    const inputs = magneticDeclinationExample.inputs;
    const year = Number(String(inputs.date_iso).slice(0, 4));
    const r = computeWMM({
      lat_deg: inputs.lat_deg, lon_deg: inputs.lon_deg, alt_km: inputs.alt_km || 0,
      decimal_year: year, coefficients,
    });
    if (!r || r.error || !Number.isFinite(r.D)) return;
    const round = (n, d) => Number(n.toFixed(d));
    byTile.set("magnetic-declination", {
      tile_id: "magnetic-declination",
      inputs: {
        lat_deg: inputs.lat_deg, lon_deg: inputs.lon_deg,
        alt_km: inputs.alt_km || 0, date: inputs.date_iso,
      },
      outputs: {
        declination_deg: { value: round(r.D, 2) },
        inclination_deg: { value: round(r.I, 2) },
        total_intensity_nT: { value: Math.round(r.F) },
        annual_change_deg_yr: { value: round(r.dD, 3) },
      },
    });
  } catch { /* the page keeps the behaviour it has today */ }

  // The general case of the same problem: a fixture that names inputs but
  // records no outputs, because the answer is a TABLE and the registry's
  // schema holds only numbers and strings. `lexile-band` told a reader to
  // enter grade 5 and then stopped, when the compute had the answer in hand
  // -- the band for the grade they entered. Where the compute returns a
  // flat, printable value beside the table, the page prints it.
  // Which result keys are BOOLEAN, asked of the compute rather than inferred
  // from the value on the page. A fixture records a boolean as 0 or 1, so by the
  // time a row is rendered the type is gone -- and `0` could equally be a count
  // or a factor, which is why this cannot be guessed from the digit. The
  // renderers state the words for most booleans (bespoke-output-bools.js); this
  // covers the rest, where a tile publishes a flag its renderer folds into a
  // combined verdict line and never prints on its own. `gcwr-check` answered
  // "Within both limits" with **1**.
  for (const [id, row] of byTile) {
    if (!row.inputs || !Object.keys(row.inputs).length) continue;
    try {
      const { run } = await import(new URL("../mcp/catalog.mjs", import.meta.url).href);
      const out = await run({ id, inputs: { ...row.inputs } });
      const result = out && out.result;
      if (!result || typeof result !== "object") continue;
      const flags = Object.keys(result).filter((k) => typeof result[k] === "boolean");
      if (flags.length) booleanKeys.set(id, new Set(flags));
    } catch { /* a tile that cannot run keeps its raw values */ }
  }

  for (const [id, row] of byTile) {
    if (!row.inputs || !Object.keys(row.inputs).length) continue;
    if (row.outputs && Object.keys(row.outputs).length) continue;
    try {
      const { run } = await import(new URL("../mcp/catalog.mjs", import.meta.url).href);
      const out = await run({ id, inputs: { ...row.inputs } });
      const result = out && out.result;
      if (!result || typeof result !== "object") continue;
      const printable = {};
      for (const [k, v] of Object.entries(result)) {
        if (typeof v === "number" ? Number.isFinite(v) : typeof v === "string") printable[k] = { value: v };
        else if (v && typeof v === "object" && !Array.isArray(v)) {
          // One level in: `selected: { grade, typical, stretch }` is the row
          // the reader asked for, and it is the answer.
          for (const [k2, v2] of Object.entries(v)) {
            if (typeof v2 !== "string" && !(typeof v2 === "number" && Number.isFinite(v2))) continue;
            // Echoing an input back is not an answer: the grade the reader
            // just entered does not need a row of its own under "You get".
            if (Object.values(row.inputs).some((iv) => String(iv) === String(v2))) continue;
            printable[`${k}_${k2}`] = { value: v2 };
          }
        }
        if (Object.keys(printable).length >= 6) break;
      }
      if (Object.keys(printable).length) byTile.set(id, { ...row, outputs: printable });
    } catch { /* leave the page as it is */ }
  }
}

// Render a fixture value as the literal a reader would type. Outputs are
// `{ value, tolerance }` wrappers; inputs are bare primitives. Anything
// structured (an array of course loads, a nested object) is emitted as
// compact JSON, which is exactly what the MCP callers pass -- unless that
// JSON is too long to read, in which case it degrades to its shape.
export function exampleValue(v) {
  const raw = (v && typeof v === "object" && !Array.isArray(v) && "value" in v) ? v.value : v;
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") return structuredValue(raw);
  if (typeof raw === "number") return String(readableNumber(raw));
  return String(raw);
}

// The longest structured literal in the registry runs 2,630 characters: the
// `historical-pricing` page told a reader to enter a whole BLS price shard,
// values and all. Past this width the row stops being an example and becomes
// a wall, so it degrades to the shape -- how many rows, and which fields --
// which is what a reader needs from it anyway.
const STRUCTURED_CAP = 120;
function structuredValue(raw) {
  // A list of rows is a TABLE the reader fills in through labelled fields --
  // air-receiver asks for "Tool 1 CFM" and "Tool 1 duty cycle (0 to 1)", not
  // for JSON. Printing the literal `[{"cfm":4,"duty_cycle":0.5},...]` on the
  // page gave them something they cannot read and would never paste, on 38
  // rows across 45 pages. Read it back as prose in the same words the fields
  // use, and it says the same thing in less room.
  // An array of bare values is a comma-separated LIST, and the field says so:
  // `search-probability` ships its own box pre-filled with the string
  // "30, 40, 50", while the page printed `[30,40,50]` -- a form that field
  // would not take as typed. Three more captions say "comma-separated" or
  // "comma or space separated" outright. So render the separator the reader
  // uses, not the JSON the value happens to be stored as.
  const list = bareListAsProse(raw);
  if (list && list.length <= STRUCTURED_CAP) return list;
  const prose = rowsAsProse(raw);
  if (prose && prose.length <= STRUCTURED_CAP) return prose;
  // A bare object of scalars is one row of labelled fields, so it reads the
  // same way: `sanitary-dfu` says "water closet private 1, lavatory 2" rather
  // than a quoted map. Only when every key is an IDENTIFIER, though --
  // `box-fill` is keyed by wire size (`{"12": 6}`), where the key is data and
  // "12 6" would read as nonsense.
  if (raw && typeof raw === "object" && !Array.isArray(raw)
      && Object.keys(raw).length > 0
      && Object.keys(raw).every((k) => /^[A-Za-z_][\w]*$/.test(k))) {
    const one = rowsAsProse([raw]);
    if (one && one.length <= STRUCTURED_CAP) return one;
  }
  const json = JSON.stringify(raw, (k, x) => (typeof x === "number" ? readableNumber(x) : x));
  if (json.length <= STRUCTURED_CAP) return json;
  if (Array.isArray(raw)) {
    // Too long either way: keep the first row, in prose when it reads, and
    // say how many more there are.
    const firstProse = rowsAsProse([raw[0]]);
    const first = firstProse && firstProse.length <= STRUCTURED_CAP
      ? firstProse
      : JSON.stringify(raw[0], (k, x) => (typeof x === "number" ? readableNumber(x) : x));
    const rest = raw.length - 1;
    const head = first && first.length <= STRUCTURED_CAP ? first : shapeOf(raw[0]);
    return rest > 0 ? `${head}, and ${rest} more` : `${head}`;
  }
  return shapeOf(raw);
}

// "12000, 17000, 17000" for an array of plain numbers or strings -- the form
// the field itself is filled with. Returns null for anything else (a row of
// labelled fields, a nested shape) so the readers below still get their turn.
function bareListAsProse(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = [];
  for (const v of raw) {
    if (v === null || typeof v === "object") return null;
    if (typeof v === "number") { if (!Number.isFinite(v)) return null; out.push(String(readableNumber(v))); }
    else if (typeof v === "string") { if (v.includes(",")) return null; out.push(v); }
    else return null;
  }
  return out.join(", ");
}

// "cfm 4, duty cycle 0.5; cfm 3, duty cycle 0.4" for an array of flat rows,
// or null when the value is not that shape (a nested row, an array of bare
// values, an object) and JSON still says it best. Field names go through
// humanizeKey, the same reader the uncaptioned example rows use, so a key it
// cannot improve on stays the key rather than becoming a worse guess.
function rowsAsProse(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const entries = Object.entries(row);
    if (entries.length === 0) return null;
    const parts = [];
    for (const [k, v] of entries) {
      if (v !== null && typeof v === "object") return null;
      const label = humanizeKey(k);
      // humanizeKey capitalises for use as a caption; mid-sentence it is
      // lower-case, except where the word is an acronym it deliberately cased.
      const name = label ? (/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label) : k;
      parts.push(`${name} ${exampleValue(v)}`.trim());
    }
    out.push(parts.join(", "));
  }
  return out.join("; ");
}

// A value-free rendering of an object: the field names, no quotes, so it
// cannot be mistaken for something to paste.
function shapeOf(x) {
  if (x === null || typeof x !== "object") return String(x);
  if (Array.isArray(x)) return `[${x.length} items]`;
  return `{${Object.keys(x).join(", ")}}`;
}

// An inverse tile's fixture holds the full-precision output of its forward
// counterpart, so the raw literal reads "target_rpm 6385.22978372389" -- a
// number nobody types. Six significant digits is past every tolerance in the
// registry (5e-6 relative) and reads as a number.
function readableNumber(n) {
  if (!Number.isFinite(n) || Number.isInteger(n)) return n;
  return Number(n.toPrecision(6));
}

// Case- and separator-insensitive comparison, for deciding whether a field
// label and its machine key say the same thing ("AWG" / "awg").
function squash(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Unit tokens a field name may END with, used to read a key like
// `tank_volume_gal` back as "Tank volume (gal)" when the calculator itself
// never captioned it. Case matters where the catalog uses case to
// disambiguate: `_A` is amps, `_F` is degrees.
const KEY_UNITS = new Map(Object.entries({
  gal: "gal", gpm: "GPM", gph: "GPH", gpd: "GPD", cfm: "CFM", cfs: "cfs", cfh: "CFH", mgd: "MGD", scfm: "SCFM",
  ft: "ft", in: "in", mm: "mm", cm: "cm", mi: "mi", yd: "yd", cy: "cy", km: "km",
  psi: "psi", psig: "psig", psid: "psid", psf: "psf", ksi: "ksi", ksf: "ksf", pcf: "pcf", plf: "plf", klf: "klf",
  lb: "lb", lbs: "lb", kip: "kip", kips: "kip", ton: "ton", tons: "ton", kg: "kg",
  hp: "hp", kw: "kW", kwh: "kWh", kva: "kVA", btuh: "Btu/h", btu: "Btu", mbh: "MBH",
  amps: "A", volts: "V", ohms: "ohms", hz: "Hz",
  deg: "deg", pct: "%", percent: "%",
  hr: "hr", hrs: "hr", yr: "yr", years: "yr", months: "months", days: "days",
  ft2: "ft\u00b2", ft3: "ft\u00b3", sqin: "sq in", sqft: "ft\u00b2", in2: "in\u00b2", in3: "in\u00b3", in4: "in\u2074",
  fpm: "fpm", fps: "fps", mph: "mph", rpm: "RPM", kt: "kt", sabins: "sabins",
  kipft: "kip-ft", ftlb: "ft-lb", inlb: "in-lb", ftkip: "ft-kip", sy: "SY", therms: "therms", acres: "acres",
  // Unambiguous multi-letter units the table was missing, so their keys read
  // back with the unit glued on as a lowercase word and the answer beside it
  // looking unitless: "Pag db = 14", "Resistance ohm = 241458", "Run time sec
  // = 300". `ohms` was already here; the singular was not.
  //
  // Deliberately NOT added: the single letters a / f / v / w / m / l. The
  // catalog uses CASE to disambiguate those (`_A` is amps, `_F` is degrees,
  // both in KEY_UNITS_CASED), and the lower-case tails are not units often
  // enough to matter -- checked, not assumed: `cramers_v` is Cramer's V, an
  // effect size, not volts, and `aspect_w` is a WIDTH, not watts. One bad
  // label is worse than a plain one. Also not `min` -- it means "minimum" far
  // more often than "minutes" (`conductor_min_A`) -- nor `acre`, which reads
  // correctly already in `seeds_per_acre`.
  //
  // And emphatically NOT `db`. It is decibels in the acoustics and RF tiles,
  // but DRY-BULB in the HVAC ones (`leaving_db_F`, `return_db_F`) and BEAM
  // DEPTH in the structural ones (`beam_depth_db_in`). Mapping it turned
  // "Leaving db (°F)" into "Leaving (dB/°F)" and a beam depth into decibels
  // per inch. Same shape as the `(C)`-is-not-always-Celsius trap: a token
  // that is a unit in one trade and a word in another needs a per-tile
  // caption, not a catalog-wide rule.
  ohm: "ohm", lbf: "lbf", psia: "psia", kvar: "kVAR", lux: "lux", sec: "sec", oz: "oz", lf: "LF",
}));
const KEY_UNITS_CASED = new Map(Object.entries({ A: "A", V: "V", F: "\u00b0F", C: "\u00b0C", W: "W", nT: "nT" }));
// A denominator ("lb_hr" = lb/hr) is only ever the LAST token of a key.
const KEY_PER_UNITS = new Map(Object.entries({ min: "min", day: "day", s: "s", hr: "hr", sf: "ft\u00b2", yr: "yr" }));
const KEY_ACRONYMS = new Set(["awg", "nec", "ada", "ocpd", "fla", "mca", "mocp", "rh", "cg", "tds", "bod", "tss",
  "srt", "hrt", "vslr", "sor", "wor", "apf", "uv", "led", "hvac", "pdp", "gpp", "wsfu", "dfu", "ach", "shr",
  "eer", "cop", "stc", "emt", "pvc", "rmc", "imc", "cmu", "srw", "spt", "cbr", "usc", "aashto", "asd", "lrfd",
  "asce", "aisc", "aci", "nds", "du"]);

// Read a machine field name back as English. This claims nothing the key does
// not already say -- it only spaces the words out and spells the unit -- so it
// is safe where a real caption is missing. Returns null when the key is too
// short or too cryptic to gain anything ("va", "ecc"), and those rows keep
// printing the key itself rather than a worse guess.
export function humanizeKey(key) {
  const parts = String(key).split("_").filter(Boolean);
  // A one-word key is already English ("ratio", "efficiency"); it only needs
  // to be capitalized so it reads as a caption beside the others. Anything
  // shorter is a symbol ("df", "ka") and says more as itself.
  if (parts.length === 1) return /^[a-z]{4,}$/.test(parts[0]) ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : null;
  if (parts.length < 2) return null;
  const units = [];
  while (parts.length > 1) {
    const raw = parts[parts.length - 1];
    const first = units.length === 0;
    let u = first ? KEY_UNITS_CASED.get(raw) : undefined;
    if (u === undefined && !/^[A-Z]$/.test(raw)) u = KEY_UNITS.get(raw.toLowerCase());
    // A per-unit denominator reached anywhere but the end is an ordinary word:
    // `conductor_min_A` is a minimum in amps, `theta_s_deg` is the variable.
    if (u === undefined && first) u = KEY_PER_UNITS.get(raw.toLowerCase());
    if (u === undefined) break;
    units.unshift(u);
    parts.pop();
  }
  // "Rimpull per ton, in lb": the name already spent the word `per`, so the
  // token before it belongs to the name and not to a quotient.
  if (units.length > 1 && parts[parts.length - 1] === "per") { parts.push(units.shift()); }
  if (!parts.length) return null;
  let unit = units.filter((u, i) => i === 0 || u !== units[i - 1]).join("/");
  // in_lb / ft_lb is a torque, not a quotient.
  if (unit === "in/lb") unit = "in-lb";
  if (unit === "ft/lb") unit = "ft-lb";
  // Same for pound-FORCE: `raise_torque_in_lbf` is inch-pounds of torque, not
  // inches per pound-force, and the slash inverts the meaning.
  if (unit === "in/lbf") unit = "in-lbf";
  if (unit === "ft/lbf") unit = "ft-lbf";
  // And resistivity is a PRODUCT: soil resistivity is ohm-cm (ohm-metres in
  // SI), never ohms per centimetre.
  if (unit === "ohm/cm") unit = "ohm-cm";
  if (unit === "ohm/m") unit = "ohm-m";
  const words = parts.map((p, i) => {
    const l = p.toLowerCase();
    if (KEY_ACRONYMS.has(l)) return l.toUpperCase();
    if (/^[A-Z]/.test(p) && p.length <= 3) return p;
    return i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l;
  });
  const base = words.join(" ");
  // A symbol alone says nothing ("fc"), but a symbol with its unit does:
  // "Fc (psi)" beats "fc_psi", so a spelled unit lowers the bar.
  if (base.length < (unit ? 1 : 3)) return null;
  return unit ? `${base} (${unit})` : base;
}

// A worked-example row list. A reader who has never seen the calculator has to
// know what a number *is* before the example teaches them anything, so each row
// leads with the field label the live calculator prints above that input
// ("Length one-way (ft)"). The machine key stays on the row, small and dimmed,
// because it is the field-name contract the MCP `run_calculator` tool takes and
// the two surfaces must stay visibly identical. `labels` is empty for a tile
// whose renderer carries no schema; those rows fall back to the key alone.
// The answer a reader sees in the calculator, when the renderer's own
// formatter agrees with the number this page is pinned to. `1200` on its own
// does not say watts; `1200.00 W` does, and it is the exact string the tool
// prints. Guarded three ways: the display must carry the pinned number (the
// worked-example gate already proves the compute matches it), must be short
// enough to stay one row on a phone, and must not be the renderer's own
// "nothing to show" placeholder.
const NO_ANSWER = new Set(["-", "--", "\u2014", "n/a", "na", "none", ""]);
function displayFor(display, val, raw, label) {
  if (typeof display !== "string") return null;
  const d = display.trim();
  if (d.length === 0 || d.length > 44) return null;
  if (NO_ANSWER.has(d.toLowerCase())) return null;
  if (typeof raw === "number") {
    const m = d.match(/-?[\d,]*\.?\d+/);
    if (!m) {
      // A pass/fail line reports its number as a word. "PASS" beats "1"; any
      // other wordless display is not this answer.
      return (raw === 0 || raw === 1) && /^[A-Za-z][A-Za-z ]{0,14}$/.test(d) ? d : null;
    }
    const n = Number(m[0].replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    const ok = raw === 0 ? Math.abs(n) < 1e-9 : Math.abs(n - raw) <= Math.abs(raw) * 0.01;
    if (!ok) return null;
    // Same stutter guard as the extracted units: "Incident energy (cal/cm^2)"
    // has said the unit once already.
    if (m.index === 0) {
      const tail = d.slice(m[0].length);
      if (tail && !withoutRepeat(tail, label)) return m[0];
    }
    return d;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return d.toLowerCase().includes(raw.trim().toLowerCase()) ? d : null;
  }
  return null;
}

// "Arc-flash boundary (in)" has already said inches; repeating it after the
// number reads like a stutter. Drop a suffix the caption already carries.
// The answer-string formatter lives in mcp/catalog.mjs so the tile pages and
// the MCP door cannot format the same number two different ways. Bound from the
// dynamic import below rather than imported statically, to keep this script's
// existing lazy-load of the catalog.
// tile id -> Set of result keys the compute returns as booleans.
const booleanKeys = new Map();
let formatWithUnit = () => null;
let withoutRepeat = (suffix) => suffix || "";
let outputBooleans = () => ({});

export function exampleRows(obj, labels, displays, units, bools, flags) {
  return Object.entries(obj || {})
    .map(([k, v]) => {
      const val = exampleValue(v);
      if (val === "") return "";
      const raw = (v && typeof v === "object" && !Array.isArray(v) && "value" in v) ? v.value : v;
      const label = labels && labels[k];
      // An uncaptioned row still prints a caption -- the key read back as
      // English -- so the stutter guard has to see the same words the reader
      // will ("Total loss db" already says decibels).
      const caption = label || humanizeKey(k) || "";
      // The formatter's own string first (it is exactly what the calculator
      // prints); a hand-written renderer's extracted unit second.
      const unit = units && units[k];
      // A boolean answer: the fixture records it as 0/1 and printing that
      // literally asked "PMI required?" and answered "0". The renderer states
      // both words itself, so the page says what the calculator says.
      const bool = bools && bools[k];
      const isFlag = raw === true || raw === false || raw === 0 || raw === 1;
      // The renderer's own words first; a plain Yes / No only where the compute
      // says the key is a boolean and the renderer never gave it words of its
      // own. Never inferred from the digit: `0` is a count on plenty of rows.
      const asBool = !isFlag ? null
        : bool ? (raw === true || raw === 1 ? bool.t : bool.f)
        : (flags && flags.has(k)) ? (raw === true || raw === 1 ? "Yes" : "No")
        : null;
      const shown = (displays && displayFor(displays[k], val, raw, caption))
        || asBool
        || (typeof raw === "number" ? formatWithUnit(unit, raw, val, caption) : null)
        || val;
      // A named row prints the name and the number, nothing else. The raw field
      // name is the API's, not the reader's: it used to trail 5,396 of the
      // 6,791 example rows in the catalog, wrapping a two-token row onto three
      // lines on a phone ("Height above the branch or fixture drain (in)" / "4
      // height_above_drain_in"). It moves to one quiet line inside the
      // collapsed proof block, where an agent or a crawler still finds it.
      if (!label) {
        // No caption: read the key itself back as English rather than making
        // the reader parse snake_case. The key is still published verbatim on
        // the "Field names used by the API" line inside the collapsed proof.
        const readable = humanizeKey(k);
        if (readable) return `      <li><span>${escapeHtml(readable)}</span> <b>${escapeHtml(shown)}</b></li>`;
        return `      <li><code>${escapeHtml(k)}</code> <b>${escapeHtml(shown)}</b></li>`;
      }
      return `      <li><span>${escapeHtml(label)}</span> <b>${escapeHtml(shown)}</b></li>`;
    })
    .filter(Boolean)
    .join("\n");
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

// The spec-v13 §6.2 / Phase G hard cap on a meta description, measured
// *after HTML escaping* -- the escaped attribute string is what the search
// snippet and the check-shells lint both read.
export const DESCRIPTION_CAP = 220;

// Cut a description down to DESCRIPTION_CAP. The old loop shaved four
// characters at a time and appended "..." wherever it landed, which left
// 734 of 1,804 tile pages ending mid-word ("...flags expec...") in the
// snippet, in og:description, in twitter:description, and in the JSON-LD
// description. Back off to a word boundary the way rowSummary does, so the
// ellipsis always follows a whole word.
export function capDescription(text) {
  if (escapeHtml(text).length <= DESCRIPTION_CAP) return text;
  // Reserve the three characters the ellipsis itself costs.
  let cut = text;
  while (escapeHtml(cut).length > DESCRIPTION_CAP - 3 && cut.length > 10) {
    cut = cut.slice(0, -4);
  }
  const sp = cut.lastIndexOf(" ");
  // Only honour the boundary if a usable amount of text survives it; a
  // description made of one very long token would otherwise collapse.
  if (sp > DESCRIPTION_CAP * 0.4) cut = cut.slice(0, sp);
  return cut.replace(/[.,;:\s-]+$/, "") + "...";
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
  const combined = lead + " " + tail;
  if (escapeHtml(combined).length <= DESCRIPTION_CAP) return combined;
  // The pair does not fit. A whole sentence beats a clipped pair, so drop
  // the tail before cutting into the lead the searcher actually wants.
  if (escapeHtml(lead).length <= DESCRIPTION_CAP) return lead;
  return capDescription(lead);
}

// Build a shell title with the spec-v13 §11.2 profession noun, falling
// back to a shorter form if the full "{Name} - {Profession Noun} -
// Rough Logic" exceeds the §6.1 70-character cap. The fallback order
// preserves the tile name (which the user is searching for) and the
// brand suffix (which establishes site identity); the profession noun
// is the optional middle that gets dropped first.
function buildTitle(tool, professionNoun, capChars) {
  // The cap is enforced (by check-shells) against the *escaped* <title>
  // text, so measure against escapeHtml length here too -- a tile name
  // with an apostrophe/ampersand (e.g. "f'm") escapes to more bytes than
  // its raw form and would otherwise slip past this cap and fail the gate.
  const escLen = (s) => escapeHtml(s).length;
  const brand = " - Rough Logic";
  const middle = " - " + professionNoun;
  const full = tool.name + middle + brand;
  if (escLen(full) <= capChars) return full;
  const noProf = tool.name + brand;
  if (escLen(noProf) <= capChars) return noProf;
  // Truncate the tile name only if both fallbacks still overflow. Keep
  // " - Rough Logic" so the brand is preserved. Grow the kept name one
  // character at a time so an escaped char never pushes the rendered
  // title over the cap (brand and "..." carry no escapable characters).
  const budget = capChars - brand.length - 3;
  if (budget < 4) return tool.name + brand;
  let kept = "";
  for (const ch of tool.name) {
    if (escLen(kept + ch) > budget) break;
    kept += ch;
  }
  return kept + "..." + brand;
}

// 20 tile pages carry no worked example because their tiles take no inputs:
// OSHA Top-10, the knot and hand-signal references, Lockout/Tagout Steps, the
// GFCI/AFCI table. Their whole value is the table itself -- and the shell
// printed the tile name, one lead sentence, and nothing else. The prerender
// exists so "the cited reference content would otherwise be invisible to
// general web search" (README); on exactly the pages that are nothing BUT
// reference content, none of it was on the page. A crawler and a no-JS reader
// got a stub.
//
// The content comes from running the tile on no inputs, the same call
// `run_calculator` makes, so the page and the agent door cannot disagree about
// what the reference says. Three shapes cover all 20 results: a string, a list
// of flat rows, and a list of rows that each carry a nested list. Anything else
// is skipped rather than guessed at -- and `check-shells` fails a reference
// page that renders nothing, so a new shape has to be handled, not dropped.
function referenceScalar(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(readableNumber(v)) : "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v.join("; ");
  return "";
}

// One row of a reference table, in the same three-slot shape the worked-example
// rows use, so the 320px audit and the readable-type floor already cover it:
// the first field leads, the second is the answer, the rest trail as
// "Label: value".
function referenceRow(item) {
  const cells = Object.entries(item)
    .map(([k, v]) => [k, referenceScalar(v)])
    .filter(([, v]) => v !== "");
  if (!cells.length) return "";
  // The S500 class table numbers each row and then names it "Class 1", which
  // renders as "1 | Class 1". Drop a leading cell the next one already states
  // as a whole word -- token equality, not substring, or the OSHA rank "1"
  // would vanish into "29 CFR 1926.501".
  if (cells.length > 1 && cells[1][1].split(/\s+/).includes(cells[0][1])) cells.shift();
  const lead = cells[0][1];
  const rest = cells.slice(1);
  const answer = rest.length ? rest[0][1] : "";
  const tail = rest.slice(1).map(([k, v]) => `${humanizeKey(k) || k}: ${v}`).join("; ");
  return [
    `      <li><span>${escapeHtml(lead)}</span>`,
    answer ? ` <b>${escapeHtml(answer)}</b>` : "",
    tail ? `<small>${escapeHtml(tail)}</small>` : "",
    "</li>",
  ].join("");
}

function referenceList(rows) {
  const items = rows.map(referenceRow).filter(Boolean);
  if (!items.length) return "";
  return ['    <ul class="shell-io">', ...items, "    </ul>"].join("\n");
}

export function referenceBlock(result) {
  const out = [];
  for (const [key, value] of Object.entries(result || {})) {
    const scalar = referenceScalar(value);
    if (scalar) { out.push(`    <p class="shell-source">${escapeHtml(scalar)}</p>`); continue; }
    if (Array.isArray(value) && value.length && value.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      // A row carrying its own nested list (Wire / Pipe / Gas Color Codes: one
      // list per wiring system) becomes a labelled sub-list, not a flattened
      // row that reads as one long sentence.
      const nested = value.every((v) => Object.values(v).some((x) => Array.isArray(x) && x.length && typeof x[0] === "object"));
      if (nested) {
        for (const row of value) {
          const label = Object.values(row).find((x) => typeof x === "string");
          const sub = Object.values(row).find((x) => Array.isArray(x) && x.length && typeof x[0] === "object");
          const list = referenceList(sub);
          if (!list) continue;
          if (label) out.push(`    <p class="shell-io-label">${escapeHtml(label)}</p>`);
          out.push(list);
        }
        continue;
      }
      const list = referenceList(value);
      if (!list) continue;
      const label = humanizeKey(key);
      if (label) out.push(`    <p class="shell-io-label">${escapeHtml(label)}</p>`);
      out.push(list);
      continue;
    }
    // An object of named lists (the inspection checklist, one list per trade).
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [name, entries] of Object.entries(value)) {
        if (!Array.isArray(entries) || !entries.length) continue;
        const rows = entries
          .map((e) => (typeof e === "string" ? `      <li><span>${escapeHtml(e)}</span></li>` : referenceRow(e)))
          .filter(Boolean);
        if (!rows.length) continue;
        out.push(`    <p class="shell-io-label">${escapeHtml(humanizeKey(name) || name)}</p>`);
        out.push(['    <ul class="shell-io">', ...rows, "    </ul>"].join("\n"));
      }
    }
  }
  return out.join("\n");
}

// spec-v13 §9.1 caps a related-tiles block at six entries.
const RELATED_CAP = 6;

// Pick 3-6 related tiles per spec-v13 §5.2 + §9.1. When the per-tile
// related-tiles registry in scripts/related-tiles.mjs has entries for the tile,
// those entries win, in the order the registry records them (the editorial
// cross-references the citation graph and worked-example narratives imply).
//
// 167 tiles have no entry, and the fallback for them used to be "the first 5
// other tiles in the same group, by TOOLS order" -- which is the SAME five for
// every uncurated tile in that group. Sheet-Metal Gauge pointed a reader at
// stair stringers and roof pitch; every uncurated construction tile pointed at
// those same five. It also concentrated the internal link graph: 482 of the
// 1,804 tiles received no related link from any tile page, while
// `square-footage` received 50.
//
// The fallback now ranks the tile's own name against its group siblings
// through the same `rankTools` the search box uses, and pads from group order
// when a short name ranks fewer than five. Deterministic (the ranker settles
// ties alphabetically), build-time only, and no new dependency. Sheet-Metal
// Gauge now points at bend springback, duct metal weight and press-brake
// thickness. Tiles receiving at least one related link: 1,322 -> 1,498; the
// heaviest receiver drops from 50 links to 30.
export function relatedTiles(tool, tools, related) {
  const byId = new Map(tools.map((t) => [t.id, t]));
  const curated = related && Array.isArray(related[tool.id]) ? related[tool.id] : [];
  const out = [];
  const seen = new Set([tool.id]);
  for (const id of curated) {
    const t = byId.get(id);
    if (t && !seen.has(t.id)) { out.push(t); seen.add(t.id); }
  }
  // §5.2 asks for 3-6, and 185 curated entries carry one or two. Those are not
  // wrong, just short: the editorial picks stay first and in order, and the
  // ranker fills to three. An uncurated tile starts from nothing and fills to
  // five.
  const want = out.length > 0 ? 3 : 5;
  if (out.length >= want) return out;
  const pool = tools.filter((t) => t.group === tool.group && !seen.has(t.id));
  const { tokens } = normalizeQuery(tool.name);
  for (const r of tokens.length ? rankTools(tokens, pool, [], { limit: want }) : []) {
    if (out.length >= want) break;
    if (!seen.has(r.tool.id)) { out.push(r.tool); seen.add(r.tool.id); }
  }
  for (const t of pool) {
    if (out.length >= want) break;
    if (!seen.has(t.id)) { out.push(t); seen.add(t.id); }
  }
  return out;
}

// Per-tile lists answer "what else should this reader see"; they say nothing
// about "who sends a reader HERE". Ranking every tile against its siblings left
// 269 of the 1,804 tiles receiving no related link from any tile page, while
// `square-footage` received 30 -- a tile nobody links to is reachable only from
// its group hub and the search box.
//
// This pass runs once over the whole catalog: it builds every tile's list, then
// for each tile that received nothing, appends it to the list of the one group
// sibling that ranks it highest and still has room under spec-v13 §9.1's cap of
// six. That is the same ranker the fallback uses, read in the other direction,
// so the host page gains a link a reader of that page would plausibly want:
// "Combustion Air" picks up "Max Appliance Input from Room Volume".
//
// Curated entries are never displaced -- the adopted tile is appended after
// everything already in the list. Orphans are processed in TOOLS order and the
// ranker settles ties alphabetically, so the graph is deterministic.
//
// 268 of the 269 find a host. `historical-pricing` cannot: it is the only tile
// in group Q, and a related link crossing groups would point a reader out of
// the trade they are working in.
export function relatedGraph(tools, related) {
  const lists = new Map(tools.map((t) => [t.id, relatedTiles(t, tools, related)]));
  const inbound = new Map(tools.map((t) => [t.id, 0]));
  for (const list of lists.values()) {
    for (const r of list) inbound.set(r.id, (inbound.get(r.id) || 0) + 1);
  }
  for (const tool of tools) {
    if (inbound.get(tool.id) > 0) continue;
    const pool = tools.filter((t) => (
      t.group === tool.group &&
      t.id !== tool.id &&
      lists.get(t.id).length < RELATED_CAP &&
      !lists.get(t.id).some((x) => x.id === tool.id)
    ));
    if (!pool.length) continue;
    const { tokens } = normalizeQuery(tool.name);
    const ranked = tokens.length ? rankTools(tokens, pool, [], { limit: 1 }) : [];
    const host = ranked.length ? ranked[0].tool : pool[0];
    lists.get(host.id).push(tool);
    inbound.set(tool.id, 1);
  }
  return lists;
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

function shellHead({ title, description, canonical, ogType, ogImage, robots }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\'; form-action \'self\'; base-uri \'self\'; object-src \'none\'; worker-src \'self\'">',
    '<meta name="referrer" content="no-referrer">',
    `<meta name="robots" content="${escapeHtml(robots || "index,follow")}">`,
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
  // A number is a depth below dist root; a string is used verbatim, which is
  // how 404.html gets ROOT-ABSOLUTE paths -- Cloudflare Pages serves that one
  // document at whatever URL was missed, so a relative "styles.css" would
  // resolve under the bad path and 404 alongside it.
  const prefix = typeof depth === "string" ? depth : "../".repeat(depth);
  return [
    `<link rel="stylesheet" href="${prefix}styles.css">`,
    `<link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">`,
  ].join("\n");
}

function shellHeader(depth) {
  // A number is a depth below dist root; a string is used verbatim, which is
  // how 404.html gets ROOT-ABSOLUTE paths -- Cloudflare Pages serves that one
  // document at whatever URL was missed, so a relative "styles.css" would
  // resolve under the bad path and 404 alongside it.
  const prefix = typeof depth === "string" ? depth : "../".repeat(depth);
  return [
    '<header class="site-header" role="banner">',
    '  <div class="header-inner">',
    `    <a class="brand" href="${prefix}" aria-label="Rough Logic home">`,
    '      <span class="wordmark">roughlogic</span>',
    '      <span class="tagline">tools for the trades</span>',
    '    </a>',
    '  </div>',
    '</header>',
  ].join("\n");
}

function shellFooter(depth = 2) {
  // A number is a depth below dist root; a string is used verbatim, which is
  // how 404.html gets ROOT-ABSOLUTE paths -- Cloudflare Pages serves that one
  // document at whatever URL was missed, so a relative "styles.css" would
  // resolve under the bad path and 404 alongside it.
  const prefix = typeof depth === "string" ? depth : "../".repeat(depth);
  return [
    '<footer class="site-footer" role="contentinfo">',
    '  <div class="footer-badges">',
    // spec-v1345: the escape hatch for the reader who cannot name what they
    // need. One click away on every page, never on the path of the reader who
    // types. It is also the internal-linking hub these 1,709 pre-rendered
    // pages never had -- /tools/ was a 404 until this spec.
    `    <a class="footer-badge" href="${prefix}tools/" aria-label="Browse all calculators">`,
    '      <span>All calculators</span>',
    '    </a>',
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

function tileShell(tool, tools, groupNames, relatedByTile, examples, labels, outLabels, outDisplays, outUnits, outBools, refContent) {
  const professionNoun = PROFESSION_NOUN[tool.trades[0]] || "Trades";
  const groupLabel = groupNames[tool.group] || tool.group;
  const groupSlug = GROUP_SLUG[tool.group] || tool.group.toLowerCase();
  const title = buildTitle(tool, professionNoun, 70);
  const description = metaDescription(tool, professionNoun);
  const canonical = `${SITE_URL}/tools/${tool.id}/`;
  const related = relatedByTile.get(tool.id) || [];
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
  // The verified worked example: the exact inputs a reader types and the
  // exact answer they get back. Same numbers the "Test with example" button
  // loads in the live calculator, so the static page and the tool agree.
  // Everything after the opening sentence. Kept on the page (it is real
  // reference content, and crawlers should still see it) but moved below the
  // worked example, so the reader gets the point and the Run button first.
  const detail = restOfDescription(tool.desc);
  const example = (examples && examples.get(tool.id)) || null;
  const inputRows = example ? exampleRows(example.inputs, labels) : "";
  // The field names `run_calculator` accepts and the result keys it returns,
  // for the rows that now print a plain-language name instead. One line, inside
  // the collapsed proof.
  // Every field name the example exercises, on one quiet line inside the
  // collapsed proof. This used to list only the CAPTIONED keys, on the theory
  // that an uncaptioned row already printed its own key. It no longer does --
  // an uncaptioned row prints the key read back as English -- so listing only
  // the captioned ones would drop `tank_volume_gal` off the page entirely and
  // leave an agent nothing to call the tile with.
  const namedKeys = example
    ? [...Object.keys(example.inputs || {}), ...Object.keys(example.outputs || {})]
        .filter((k, i, all) => all.indexOf(k) === i)
        .filter((k) => exampleValue((example.inputs || {})[k] ?? (example.outputs || {})[k]) !== "")
    : [];
  const outputRows = example ? exampleRows(example.outputs, outLabels, outDisplays, outUnits, outBools, booleanKeys.get(tool.id)) : "";
  const assumptionRows = (citation && Array.isArray(citation.assumptions) ? citation.assumptions : [])
    .map((a) => `      <li><span>${escapeHtml(a.name)}</span> <b>${escapeHtml(a.value)}</b><small>${escapeHtml(a.source)}</small></li>`)
    .join("\n");
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
    `  <p class="shell-lead">${escapeHtml(leadSentence(tool.desc))}</p>`,
    '  <p class="shell-run">',
    // `?example=1` makes renderToolView load the same worked example this page
    // prints, so a reader who just read "awg 12 -> 24.4 A" lands on a
    // calculator already showing it, ready to be edited. Tiles with no example
    // button ignore the param.
    // 17 tiles are reference pages with nothing to enter (LOTO steps, water-loss
    // classes). "Run the calculator" promises them a calculator; say what they
    // actually get.
    `    <a class="shell-run-link" href="../../#${escapeHtml(tool.id)}${example ? "?example=1" : ""}">${inputRows ? "Run the calculator" : "Open the reference"}</a>`,
    '  </p>',
    inputRows ? [
      '  <section class="shell-section" aria-label="Example">',
      '    <h2>Example</h2>',
      '    <p class="shell-io-label">You enter</p>',
      '    <ul class="shell-io">',
      inputRows,
      '    </ul>',
      outputRows ? '    <p class="shell-io-label">You get</p>' : '',
      outputRows ? '    <ul class="shell-io">' : '',
      outputRows,
      outputRows ? '    </ul>' : '',
      '  </section>',
    ].filter(Boolean).join("\n") : '',
    (!inputRows && refContent) ? [
      '  <section class="shell-section" aria-label="Reference">',
      '    <h2>Reference</h2>',
      refContent,
      '  </section>',
    ].join("\n") : '',
    // ONE disclosure holds everything the reader may want after the answer:
    // the scope prose, the formula, the source lines, the API field names, and
    // the assumptions. It used to be two adjacent <details> -- "More about
    // this calculator" and the proof -- which put the same reference material
    // behind two clicks in two places on 1,430 of 1,709 pages, and made the
    // reader guess which one held the sentence they wanted. One block, one
    // click, one place. The visible page stays title, one line, Run, example.
    (detail || citation) ? [
      '  <details class="shell-proof" aria-label="Details, formula, and sources">',
      '    <summary>Details, formula, and sources</summary>',
      detail ? `    <p class="shell-detail">${escapeHtml(detail)}</p>` : '',
      citation ? `    <p class="shell-formula">${escapeHtml(citation.formula)}</p>` : '',
      citation ? `    <p class="shell-source">${escapeHtml(citation.edition)}</p>` : '',
      citation && citation.freeAccess ? `    <p class="shell-source">${escapeHtml(citation.freeAccess)}</p>` : '',
      citation && citation.governance ? `    <p class="shell-source">${escapeHtml(citation.governance)}</p>` : '',
      namedKeys.length ? `    <p class="shell-source">Field names used by the API: ${namedKeys.map((k) => `<code>${escapeHtml(k)}</code>`).join(", ")}</p>` : '',
      assumptionRows ? '    <ul class="shell-io shell-assume">' : '',
      assumptionRows,
      assumptionRows ? '    </ul>' : '',
      '  </details>',
    ].filter(Boolean).join("\n") : '',
    // The proof has to print in full: a sheet of paper has no disclosure to
    // click, and the formula and its authority are the reference content the
    // page exists to carry. styles.css tried to do that by making the closed
    // <details> render in print media -- which works in Chromium and in NO
    // other engine. Measured 2026-08-31: printing a tile shell in WebKit drops
    // the formula and every source line. The SPA papers over this by setting
    // `open` on beforeprint; a shell runs zero JavaScript and cannot.
    //
    // So print from a copy instead. The <details> is hidden in print media and
    // this block takes its place, on every engine and with no script. It is
    // display:none on screen and aria-hidden, so a screen reader is not read
    // the same paragraphs twice, and the <details> count the one-disclosure
    // gate pins is unchanged -- this is a <div>.
    (detail || citation) ? [
      '  <div class="shell-print-proof" aria-hidden="true">',
      '    <p class="shell-print-proof-title">Details, formula, and sources</p>',
      detail ? `    <p class="shell-detail">${escapeHtml(detail)}</p>` : '',
      citation ? `    <p class="shell-formula">${escapeHtml(citation.formula)}</p>` : '',
      citation ? `    <p class="shell-source">${escapeHtml(citation.edition)}</p>` : '',
      citation && citation.freeAccess ? `    <p class="shell-source">${escapeHtml(citation.freeAccess)}</p>` : '',
      citation && citation.governance ? `    <p class="shell-source">${escapeHtml(citation.governance)}</p>` : '',
      assumptionRows ? '    <ul class="shell-io shell-assume">' : '',
      assumptionRows,
      assumptionRows ? '    </ul>' : '',
      '  </div>',
    ].filter(Boolean).join("\n") : '',
    relatedItems ? [
      '  <section class="shell-section" aria-label="Related tools">',
      '    <h2>Related tools</h2>',
      '    <ul class="shell-related">',
      relatedItems,
      '    </ul>',
      '  </section>',
    ].join("\n") : '',
    '</main>',
    footer,
    '</body>',
    '</html>',
    '',
  ].filter(Boolean).join("\n");
  return [head, styles, jsonld, '</head>', body].join("\n");
}

// The one line under a group hub's <h1>.
//
// It used to name the group again -- "Electrical" as the heading, then "206
// calculators for electrical" directly beneath it -- which said the same word
// twice and read badly for every label that is not an adjective ("135
// calculators for mechanic - auto, marine, aviation"). The heading, the title,
// the breadcrumb and the meta description all still carry the name, so the
// lead just counts what is on the page.
//
// Both clauses have to agree with the count: the one-tile group read "1
// calculator ... Every one runs in your browser."
export function groupLead(count) {
  const what = count === 1 ? "calculator. It runs" : "calculators. Every one runs";
  return `${count} ${what} in your browser. Free, no account.`;
}

function groupShell(group, tools, groupNames) {
  const groupLabel = groupNames[group] || group;
  const groupSlug = GROUP_SLUG[group] || group.toLowerCase();
  const tilesInGroup = tools.filter((t) => t.group === group);
  if (tilesInGroup.length === 0) return null;
  const title = `${groupLabel} Calculators - Rough Logic`;
  const sample = tilesInGroup.slice(0, 3).map((t) => t.name).join(", ");
  const groupHead = `Calculators and reference tools for ${groupLabel.toLowerCase()}: ${sample}, and more.`;
  const groupTail = "Free, client-side, ad-free, account-free reference for the trades and adjacent professions.";
  // Cap against the escaped length (check-shells reads the escaped <meta
  // content>), mirroring metaDescription and buildTitle: a sample tile name
  // with an apostrophe or ampersand escapes to more bytes than its raw form,
  // so a raw-length cap can let the rendered description slip past 220. As on
  // a tile page, the tail is dropped whole rather than clipped, so the hub
  // never advertises itself with half a sentence.
  let description = groupHead + " " + groupTail;
  if (escapeHtml(description).length > DESCRIPTION_CAP) {
    description = escapeHtml(groupHead).length <= DESCRIPTION_CAP ? groupHead : capDescription(groupHead);
  }
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
    `      <li><a href="../../tools/${escapeHtml(t.id)}/">${escapeHtml(t.name)}</a><span class="shell-related-desc"> - ${escapeHtml(rowSummary(t.desc))}</span></li>`
  )).join("\n");
  const siblingHubs = [...new Set(tools.map((t) => t.group))]
    .filter((g) => g !== group)
    .sort()
    .map((g) => {
      const slug = GROUP_SLUG[g] || g.toLowerCase();
      const label = groupNames[g] || ("Group " + g);
      const n = tools.filter((t) => t.group === g).length;
      return `      <li><a href="../${escapeHtml(slug)}/">${escapeHtml(label)}</a><span class="shell-related-desc"> - ${n} calculators</span></li>`;
    })
    .join("\n");
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
    `  <p class="shell-lead">${escapeHtml(groupLead(tilesInGroup.length))}</p>`,
    `  <p class="shell-run"><a class="shell-run-link" href="../../#group=${escapeHtml(group)}">Open the live group view</a></p>`,
    '  <section class="shell-section" aria-label="Tools in this group">',
    '    <h2>Tools in this group</h2>',
    '    <ul class="shell-related shell-tile-list">',
    items,
    '    </ul>',
    '  </section>',
    // The hubs used to cross-link only by SPA hash -- `../../#group=E`, which
    // is a fragment, not a crawlable URL. scope-one-box.md records the
    // consequence as a measured fact: hub-to-hub link equity does not flow, and
    // each hub is reachable only from its own tiles, the home nav and the
    // sitemap. /groups/construction/ is the site's top organic landing page, so
    // the fix is the charter's safe half -- addition. Every hub now links every
    // other hub as a real URL, with its live count.
    '  <section class="shell-section" aria-label="Other trades">',
    '    <h2>Other trades</h2>',
    '    <ul class="shell-related shell-tile-list">',
    siblingHubs,
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

// spec-v1345: the catalog page at /tools/.
//
// The home page takes a question and does not offer a menu, which is right for
// the reader who knows what they need. It is not right for the one who does
// not: search only works if you can name the thing. And a catalog of 1,709
// with no way to see the catalog reads as a site hiding its inventory.
//
// It is also the internal-linking hub this site never had. /tools/<id>/ has
// existed only in the sitemap and in whatever "Related tools" picked, and
// /tools/ itself was a 404 sitting directly above 1,709 pre-rendered pages.
//
// Grouped by the catalog's own 21 trade groups rather than A-Z, because a flat
// list of 1,709 names is not browsable -- the groups let a reader find the
// neighbourhood before the name. It also mirrors what already ranks:
// /groups/construction/ is the top organic landing page, so category-first is
// the shape this audience already uses.
//
// EACH GROUP HEADING LINKS ITS HUB as a real crawlable URL. The hubs
// cross-link each other only by SPA hash (`../../#group=E`), which is a
// fragment and not a URL, so this page is the first thing on the site to pass
// real link equity between them.
//
// Every count is computed from the live TOOLS array, so nothing here can drift
// the way a hand-typed count does and no check-readme-counts surface is needed.
// dist/404.html. Cloudflare Pages serves this document, with a 404 status, for
// any path that matches no file -- a retired tile id, a mistyped URL, a stale
// external link into a catalog that has renumbered twice. Until 2026-08-31 the
// site shipped none, so those readers got the platform's default: no wordmark,
// no search, no way back into 1,804 calculators.
//
// Every path on this page is ROOT-ABSOLUTE. The document is served AT THE
// MISSED URL, so a relative "styles.css" would resolve to
// /tools/typo/styles.css and 404 alongside it -- the same trap that made the
// offline navigation fallback render unstyled.
//
// noindex: a 404 that invites indexing is a 404 in the index.
function notFoundShell(tools, groupNames) {
  const order = [...new Set(tools.map((t) => t.group))].sort();
  const labelFor = (g) => groupNames[g] || ("Group " + g);
  const title = "Page not found - Rough Logic";
  const description =
    "That page is not here. Every one of the " + tools.length +
    " free trade calculators on Rough Logic is one link away.";
  const head = shellHead({
    title,
    description,
    canonical: SITE_URL + "/",
    ogType: "website",
    robots: "noindex,follow",
  });
  // A WebPage item, because every shell carries structured data and the gate
  // that checks it is shared. Nothing here invites indexing: the robots meta
  // above says noindex, and the canonical points at the home page.
  const jsonld = jsonLdBlock([
    { "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: SITE_URL + "/" },
  ]);
  const body = [
    '<body class="shell-page">',
    shellHeader("/"),
    '<main id="main" class="shell-main">',
    '  <h1 class="shell-h1">Page not found</h1>',
    `  <p class="shell-lead">That page is not here. Every one of the ${tools.length} calculators is one link away.</p>`,
    '  <p class="shell-run">',
    '    <a class="shell-run-link" href="/tools/">Browse all calculators</a>',
    '  </p>',
    '  <section class="shell-section" aria-label="Trades">',
    '    <h2>Or start with a trade</h2>',
    '    <ul class="shell-related shell-tile-list">',
    order.map((g) => {
      const slug = GROUP_SLUG[g] || g.toLowerCase();
      const n = tools.filter((t) => t.group === g).length;
      return `      <li><a href="/groups/${escapeHtml(slug)}/">${escapeHtml(labelFor(g))}</a><span class="shell-related-desc"> - ${n} calculators</span></li>`;
    }).join("\n"),
    '    </ul>',
    '  </section>',
    '</main>',
    shellFooter("/"),
    '</body>',
    '</html>',
    '',
  ].join("\n");
  return [head, shellStylesAndIcons("/"), jsonld, '</head>', body].join("\n");
}

function toolsIndexShell(tools, groupNames) {
  const canonical = SITE_URL + "/tools/";
  const byGroup = new Map();
  for (const t of tools) {
    if (!byGroup.has(t.group)) byGroup.set(t.group, []);
    byGroup.get(t.group).push(t);
  }
  // Sorted by group letter, which is the order the site already presents its
  // trades in. A group present in TOOLS but missing from GROUP_NAMES still
  // renders, under "Group <letter>", so a new trade appears on this page
  // rather than vanishing from it.
  const order = [...byGroup.keys()].sort();

  const labelFor = (g) => groupNames[g] || ("Group " + g);

  const jump = order.map((g) => {
    const slug = GROUP_SLUG[g] || g.toLowerCase();
    return `      <li><a href="#g-${escapeHtml(slug)}">${escapeHtml(labelFor(g))}</a></li>`;
  }).join("\n");

  const sections = order.map((g) => {
    const slug = GROUP_SLUG[g] || g.toLowerCase();
    const rows = byGroup.get(g).slice().sort((a, b) => a.name.localeCompare(b.name));
    return [
      `  <section class="ti-group" aria-labelledby="g-${escapeHtml(slug)}">`,
      `    <h2 id="g-${escapeHtml(slug)}">`,
      `      <a class="ti-hub" href="../groups/${escapeHtml(slug)}/">${escapeHtml(labelFor(g))}</a>`,
      `      <span class="ti-count">${rows.length}</span>`,
      '    </h2>',
      '    <ul class="ti-list">',
      rows.map((t) => `      <li><a href="${escapeHtml(t.id)}/">${escapeHtml(t.name)}</a></li>`).join("\n"),
      '    </ul>',
      '  </section>',
    ].join("\n");
  }).join("\n");

  const title = "All " + tools.length + " Calculators - Rough Logic";
  const description =
    "Every one of the " + tools.length + " free trade calculators on Rough Logic, grouped by trade. " +
    "Runs in your browser. No signup, no ads, no tracking, no AI.";

  const jsonld = jsonLdBlock([
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
        { "@type": "ListItem", position: 2, name: "All calculators", item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      numberOfItems: order.length,
      itemListElement: order.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: labelFor(g),
        url: SITE_URL + "/groups/" + (GROUP_SLUG[g] || g.toLowerCase()) + "/",
      })),
    },
  ]);

  const head = shellHead({ title, description, canonical, ogType: "website" });
  const styles = shellStylesAndIcons(1);
  const body = [
    // `shell-page` is load-bearing: 40 rules in styles.css are scoped to it,
    // including the container width and the CTA treatment. Without it this
    // page renders as unstyled prose that merely looks close.
    '<body class="shell-page">',
    shellHeader(1),
    '<main class="shell-main tools-index">',
    `  <h1 class="shell-h1">All ${tools.length} calculators</h1>`,
    '  <p class="shell-lede">Every calculator on Rough Logic, grouped by trade. If you already know what you need, asking is faster.</p>',
    '  <p class="ti-cta"><a class="shell-run-link" href="../">Ask for it instead</a></p>',
    '  <nav class="ti-jump" aria-label="Jump to a trade">',
    '    <ul>',
    jump,
    '    </ul>',
    '  </nav>',
    sections,
    '</main>',
    shellFooter(1),
    '</body>',
    '</html>',
    '',
  ].join("\n");
  return [head, styles, jsonld, '</head>', body].join("\n");
}

// Per-URL <lastmod>. Every URL used to carry the build timestamp, so a crawler
// saw all 1,827 pages claiming to have changed today on every push, next to a
// <changefreq> of `monthly` on the same URL -- a signal a search engine drops
// wholesale once it can see it does not track content. `lastmodFor` reads the
// committed scripts/page-lastmod.json ledger, which records the hash of the bytes
// each URL serves and the date that hash was last stamped, and falls back to
// the build date for a page the ledger has not caught up with yet.
function buildSitemap(tools, groups, builtIso, lastmodByPath) {
  const built = builtIso.slice(0, 10);
  const lastmodFor = (path) => {
    const row = lastmodByPath && lastmodByPath[path];
    return row && row.date ? row.date : built;
  };
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  // Home.
  lines.push('  <url>');
  lines.push(`    <loc>${SITE_URL}/</loc>`);
  lines.push(`    <lastmod>${lastmodFor("/")}</lastmod>`);
  lines.push('    <changefreq>weekly</changefreq>');
  lines.push('    <priority>1.0</priority>');
  lines.push('  </url>');
  // Groups.
  for (const g of groups) {
    const slug = GROUP_SLUG[g] || g.toLowerCase();
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}/groups/${slug}/</loc>`);
    lines.push(`    <lastmod>${lastmodFor(`/groups/${slug}/`)}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.8</priority>');
    lines.push('  </url>');
  }
  // spec-v1345: the catalog hub.
  lines.push('  <url>');
  lines.push(`    <loc>${SITE_URL}/tools/</loc>`);
  lines.push(`    <lastmod>${lastmodFor("/tools/")}</lastmod>`);
  lines.push('    <changefreq>weekly</changefreq>');
  lines.push('    <priority>0.9</priority>');
  lines.push('  </url>');
  // Tiles.
  for (const t of tools) {
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}/tools/${t.id}/</loc>`);
    lines.push(`    <lastmod>${lastmodFor(`/tools/${t.id}/`)}</lastmod>`);
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
  // One pass over the catalog so no tile page ends up with zero inbound links.
  const relatedByTile = relatedGraph(tools, relatedMap);
  const examples = await loadWorkedExamples();
  // The field labels the browser prints above each input, resolved through the
  // same MCP catalog layer the agent surface reads, so the label on a shell and
  // the label in the calculator can never drift. ~140 ms for the whole catalog.
  const catalog = await import(resolve(ROOT, "mcp/catalog.mjs"));
  const { inputLabels, outputLabels, outputDisplays, outputUnits } = catalog;
  formatWithUnit = catalog.formatWithUnit;
  withoutRepeat = catalog.withoutRepeat;
  outputBooleans = catalog.outputBooleans;

  let shellCount = 0;
  // Per-tile shells.
  for (const tool of tools) {
    const labels = await inputLabels(tool.id);
    const outLabels = await outputLabels(tool.id);
    // The exact answer strings the calculator prints for this page's example,
    // so "You get" carries the unit instead of a bare number.
    const ex = examples.get(tool.id);
    const outDisplays = ex ? await outputDisplays(tool.id, ex.inputs) : {};
    const outUnits = outputUnits(tool.id);
    const outBools = outputBooleans(tool.id);
    // A tile with no worked-example inputs is a reference page; its content is
    // whatever it computes on nothing, which is what the agent door returns too.
    let refContent = "";
    if (!examples.get(tool.id) || !Object.keys(examples.get(tool.id).inputs || {}).length) {
      try {
        const ran = await catalog.run({ id: tool.id, inputs: {} });
        refContent = referenceBlock(ran && ran.result);
      } catch {
        refContent = "";
      }
    }
    const html = tileShell(tool, tools, groupNames, relatedByTile, examples, labels, outLabels, outDisplays, outUnits, outBools, refContent);
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

  await writeFile(resolve(DIST, "404.html"), notFoundShell(tools, groupNames), "utf8");

  // spec-v1345: the catalog hub at /tools/index.html.
  const toolsIndexOut = resolve(DIST, "tools", "index.html");
  await mkdir(dirname(toolsIndexOut), { recursive: true });
  await writeFile(toolsIndexOut, toolsIndexShell(tools, groupNames), "utf8");

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
  const { pages: lastmodByPath } = await loadLedger();
  const sitemap = buildSitemap(tools, groups, builtIso, lastmodByPath);
  await writeFile(resolve(DIST, "sitemap.xml"), sitemap, "utf8");

  console.log(
    "build-shells: " + shellCount + " tile shells, " +
    groupCount + " group shells, 1 catalog hub, sitemap with " +
    (2 + groups.length + tools.length) + " URLs."
  );
}

// Run only when invoked as a script, so a unit test can import humanizeKey
// without kicking off a full shell build.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
