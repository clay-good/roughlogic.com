// The <title> and <meta name="description"> a tile page carries.
//
// There are TWO surfaces that show a tile at the same canonical URL: the
// prerendered shell at `/tools/<id>/`, written by scripts/build-shells.mjs,
// and the SPA route `/#<id>`, whose head app.js rewrites on every navigation.
// app.js has claimed since spec-v13 §5.5 that it sets those tags "to match the
// per-tile shell". It did not. Measured 2026-09-01 against the built shells:
// 1,396 of 1,804 titles and 1,685 of 1,804 descriptions differed, because the
// SPA wrote `name + " - Rough Logic"` and the raw `desc` while the shell wrote
// the profession noun, the reference tail, and both spec caps.
//
// That is the same defect the home page carried earlier the same day, one
// route up: a file gated and a running page not. The fix there was to assert
// the two copies of one string are equal. The fix here is that there is only
// one copy -- this module -- imported by the build script that writes the
// shell and dynamic-imported by app.js on a tile route, so the two surfaces
// cannot describe the same URL differently again.
//
// Kept out of the home-view payload: app.js imports it inside
// updateHeadForTool(), which only runs on a tool route.

// Maps the first entry in a tile's `trades` array to the profession noun
// rendered in the <title>. Spec-v13 §11.2: titles carry the profession noun
// so a search query that names a generic trade ("electrician calculator")
// matches.
export const PROFESSION_NOUN = {
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
  // The 48 slugs below were missing until 2026-09-01, and their absence was
  // invisible because the miss is silent: PROFESSION_NOUN[unknown] falls back
  // to "Trades", which is a real noun for the `reference` trade and reads as a
  // deliberate choice everywhere else. 705 of 1,804 tiles took that fallback;
  // 485 shells were titled "... - Trades - Rough Logic".
  //
  // Two of them, `real-estate` (35 tiles) and `education` (29), were near-miss
  // spellings of keys that WERE here -- `realestate` and `edu` -- so the map
  // carried an entry for those trades that no tile could ever match. Those two
  // dead keys are gone, along with `vet`, `ems` and `aviation`, which appear
  // in no tile's trades array at all. shell-meta.test.js now sweeps the map in
  // both directions, so neither a new trade nor a dead key stays quiet.
  construction: "Construction",
  welding: "Welders",
  fabrication: "Fabrication",
  "real-estate": "Real Estate",
  rigging: "Riggers",
  machinist: "Machinists",
  concrete: "Concrete",
  education: "Educators",
  solar: "Solar",
  machining: "Machining",
  surveying: "Surveyors",
  pipefitting: "Pipefitters",
  roofing: "Roofers",
  masonry: "Masonry",
  "low-voltage": "Low Voltage",
  "live-production": "Stage and Live Production",
  arborist: "Arborists",
  wastewater: "Wastewater Operators",
  "pool-service": "Pool Service",
  refrigeration: "Refrigeration",
  "sheet-metal": "Sheet Metal",
  landscaping: "Landscaping",
  civil: "Civil",
  glazing: "Glazing",
  drywall: "Drywall",
  flooring: "Flooring",
  "food-service": "Food Service",
  insulation: "Insulation",
  "water-treatment": "Water Operators",
  fencing: "Fencing",
  forester: "Foresters",
  irrigation: "Irrigation",
  "water-operations": "Water Operators",
  hardscape: "Hardscape",
  forestry: "Forestry",
  waterproofing: "Waterproofing",
  rescue: "Rescue",
  marine: "Marine",
  elevator: "Elevator",
  mechanical: "Mechanical",
  demolition: "Demolition",
  fireproofing: "Fireproofing",
  tile: "Tile Setters",
  "auto-body": "Auto Body",
  gas: "Gas",
  coatings: "Coatings",
  "door-hardware": "Door Hardware",
  painting: "Painters",
};

// Escape a string for embedding inside HTML text content or an attribute.
// The shells embed only the tile name, the description, and the group label,
// all of which the existing grep-checks lint already screens for banned
// glyphs (emoji, em-dash). The escape here is the standard XSS-hardening pass
// that every static-site generator runs.
//
// The SPA sets these values through the DOM and never escapes anything, but it
// still needs this function: both caps are measured against the ESCAPED length,
// because the escaped attribute string is what a search snippet reads. A title
// that fits raw and overflows escaped has to be cut on both surfaces or they
// diverge on exactly the tiles with an apostrophe in the name.
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The spec-v13 §6.1 / §6.2 hard caps, measured *after HTML escaping* -- the
// escaped string is what the search snippet and the check-shells lint read.
export const TITLE_CAP = 70;
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

// Cut a tile name to fit the title cap. The <title> is the blue link text in
// a search result and the label on the browser tab, and until 2026-09-01 the
// cut landed wherever the character loop stopped: 86 of the 133 truncated
// titles ended mid-word ("ASCE 7 ASD Load Combinations: Governing Demand and
// Ne...", "Compressor Volumetric Efficiency (Clearance Re-Expans..."), the
// same defect the meta description carried. Two back-offs, in order:
//   1. to a word boundary, so the ellipsis follows a whole word;
//   2. to before an unclosed "(", so the title never trails an opened
//      parenthetical it does not finish -- "Accessible Shower Compartment
//      Types..." reads as a name, "...Types (2010 ADA Standar..." does not.
// Each back-off is skipped if it would eat so much of the name that the
// remainder stops identifying the tile.
export function truncateName(name, budget, escLen = (s) => s.length) {
  let kept = "";
  for (const ch of name) {
    if (escLen(kept + ch) > budget) break;
    kept += ch;
  }
  const floor = Math.floor(budget * 0.4);
  const sp = kept.lastIndexOf(" ");
  if (sp > floor) kept = kept.slice(0, sp);
  const open = kept.lastIndexOf("(");
  if (open > floor && kept.indexOf(")", open) === -1) kept = kept.slice(0, open);
  return kept.replace(/[.,;:\s([-]+$/, "");
}

// Build a shell title with the spec-v13 §11.2 profession noun, falling back to
// a shorter form if the full "{Name} - {Profession Noun} - Rough Logic"
// exceeds the §6.1 70-character cap. The fallback order preserves the tile
// name (which the user is searching for) and the brand suffix (which
// establishes site identity); the profession noun is the optional middle that
// gets dropped first.
export function buildTitle(tool, professionNoun, capChars = TITLE_CAP) {
  // The cap is enforced (by check-shells) against the *escaped* <title> text,
  // so measure against escapeHtml length here too -- a tile name with an
  // apostrophe/ampersand (e.g. "f'm") escapes to more bytes than its raw form
  // and would otherwise slip past this cap and fail the gate.
  const escLen = (s) => escapeHtml(s).length;
  const brand = " - Rough Logic";
  const middle = " - " + professionNoun;
  const full = tool.name + middle + brand;
  if (escLen(full) <= capChars) return full;
  const noProf = tool.name + brand;
  if (escLen(noProf) <= capChars) return noProf;
  // Truncate the tile name only if both fallbacks still overflow. Keep
  // " - Rough Logic" so the brand is preserved. Grow the kept name one
  // character at a time so an escaped char never pushes the rendered title
  // over the cap (brand and "..." carry no escapable characters).
  const budget = capChars - brand.length - 3;
  if (budget < 4) return tool.name + brand;
  return truncateName(tool.name, budget, escLen) + "..." + brand;
}

// One-line description expanded from the tile's `desc` field per spec-v13
// §11.1, within the §6.2 cap measured after escaping.
export function metaDescription(tool, professionNoun) {
  // The tile's own opening sentence, unedited. It used to be rewritten first:
  // a description not starting with one of two dozen allowlisted verbs got
  // "Reference for " glued on and its first letter lowercased, per the §11.1
  // rule that the snippet should lead with the verb. That fired on 1,786 of
  // 1,804 tiles -- the descs were rewritten into complete sentences in the
  // 2026-08-17 maintainer-voice pass, and a complete sentence does not start
  // with an allowlisted verb -- and it produced broken English at scale:
  // "Reference for a stair that satisfies the building code can fail the ADA",
  // "Reference for sizes the power supply and standby battery". It never
  // delivered the rule either: "Reference for" is a noun, so the snippet led
  // with a verb on the 18 tiles the prefix skipped and on none of the rest.
  let lead = tool.desc.trim();
  if (!lead.endsWith(".")) lead += ".";
  const tail = "Client-side, ad-free, account-free reference for " + professionNoun.toLowerCase() + ".";
  const combined = lead + " " + tail;
  if (escapeHtml(combined).length <= DESCRIPTION_CAP) return combined;
  // The pair does not fit. A whole sentence beats a clipped pair, so drop the
  // tail before cutting into the lead the searcher actually wants.
  if (escapeHtml(lead).length <= DESCRIPTION_CAP) return lead;
  return capDescription(lead);
}

// The profession noun a tile's title and description use. Tiles carry an
// ordered `trades` array; the first entry is the tile's primary trade.
export function professionNounFor(tool) {
  return PROFESSION_NOUN[tool.trades && tool.trades[0]] || "Trades";
}

// The whole head pair for one tile, which is the call both surfaces make.
export function headForTool(tool) {
  const noun = professionNounFor(tool);
  return { title: buildTitle(tool, noun), description: metaDescription(tool, noun) };
}
