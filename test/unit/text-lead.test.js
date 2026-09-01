// The description splitter behind every public lead: the shell lead, the live
// .view-desc, the group-hub row, and the meta description. A regression here
// is visible on 1,709 public pages at once, so the contract is pinned.

import { test } from "node:test";
import assert from "node:assert/strict";
import { firstSentence, leadSentence, restOfDescription } from "../../text-lead.js";
import { TOOLS } from "../../tools-data.js";

// The module's own cap, not a second copy of it: this constant read 160 while
// text-lead.js read 120, so the one assertion using it was 40 characters
// looser than the rule it was meant to check.
const LEAD_CAP = 120;
// A lead cut at a clause or comma seam is `sentence.slice(0, at) + "."`, and
// `at` is checked against the cap before the period is appended -- so a seam
// landing exactly on the cap yields one character more. Five tiles do that
// today. Tightening the seam budget by one was tried and rejected: it costs
// real words on four of them ("...depth-of-discharge, and round-trip
// efficiency" loses its last term) and forces the fifth from a clean sentence
// onto an ellipsis, all to satisfy a soft layout target by one character.
const LEAD_MAX = LEAD_CAP + 1;

test("firstSentence does not split inside a standard reference", () => {
  const d = "The panel-zone strength takes (1.4 - Pr/Pc) (Eq. J10-10) past 0.4 Pc. A second sentence follows.";
  assert.equal(firstSentence(d), "The panel-zone strength takes (1.4 - Pr/Pc) (Eq. J10-10) past 0.4 Pc.");
});

test("firstSentence does not split on a decimal point", () => {
  assert.equal(firstSentence("A head of 0.75 ft over the crest of the weir. Next up."), "A head of 0.75 ft over the crest of the weir.");
});

test("firstSentence does not split after a unit abbreviation mid-sentence", () => {
  const d = "Allow 3 in. Of clearance is measured to the face, and the run continues past it.";
  assert.equal(firstSentence(d), d);
});

test("a sentence within the cap is returned whole", () => {
  const d = "The equipment grounding conductor for each raceway of a paralleled feeder.";
  assert.equal(leadSentence(d), d);
});

test("an overlong sentence is cut at the fullest clause seam that fits", () => {
  const d =
    "The specific-energy diagram of an open channel: E = y + q^2/(2 g y^2) is the flow " +
    "energy measured from the bed, and for one discharge the same E passes at two alternate depths.";
  assert.equal(leadSentence(d), "The specific-energy diagram of an open channel.");
});

test("a colon before MIN_LEAD falls back to a comma seam instead of shipping the whole sentence", () => {
  const d =
    "Bluff-body aerodynamic drag: F = 1/2 rho V^2 Cd A, the reason a vehicle needs so much " +
    "more power at highway speed, with rho the mass air density and V the speed of travel.";
  const lead = leadSentence(d);
  assert.ok(lead.length <= LEAD_CAP, "lead ran to " + lead.length + " chars");
  assert.ok(lead.startsWith("Bluff-body aerodynamic drag: F = 1/2 rho V^2 Cd A"));
});

test("a seam inside a parenthetical is never chosen", () => {
  const d =
    "Computes the commercial general-lighting load plus the general-use receptacle load " +
    "at 180 VA per strap (100% of the first 10 kVA, 50% of the remainder, per 220.44).";
  const lead = leadSentence(d);
  let depth = 0;
  for (const ch of lead) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
  }
  assert.equal(depth, 0, "lead ends on an unclosed bracket: " + lead);
});

test("a colon-cut lead is not printed twice: Details starts after the colon", () => {
  const d =
    "The specific-energy diagram of an open channel: E = y + q^2/(2 g y^2) is the flow " +
    "energy measured from the bed, and for one discharge the same E passes at two alternate depths.";
  const lead = leadSentence(d);
  const rest = restOfDescription(d);
  assert.equal(lead, "The specific-energy diagram of an open channel.");
  assert.ok(!rest.startsWith("The specific-energy diagram"), "Details repeats the lead: " + rest);
  assert.ok(rest.startsWith("E = y + q^2"), rest);
  // Nothing is lost from the page: the lead carries the summary, Details the rest.
  assert.equal(lead.replace(/\.$/, "") + ": " + rest, d);
});

test("a colon-cut Details opens as a sentence, but never re-cases a variable", () => {
  const prose =
    "The most microinverters or AC modules on one AC branch circuit: their combined " +
    "continuous output, as a continuous load, cannot exceed 80% of the branch overcurrent " +
    "device rating per NEC 210.20(A), which is what caps the string length.";
  assert.ok(restOfDescription(prose).startsWith("Their combined"), restOfDescription(prose));

  // `d` is the AWG diameter, not the first word of a sentence.
  const formula =
    "The bare-conductor size behind a gauge number, from the AWG definition: " +
    "d = 0.005 x 92^((36 - n)/39) inches, so every 6 gauges roughly doubles the diameter " +
    "and #12 AWG lands at 0.0808 in, which is the number the ampacity tables are built on.";
  assert.ok(restOfDescription(formula).startsWith("d = 0.005"), restOfDescription(formula));
});

test("a non-colon clause cut still repeats the sentence, rather than open mid-thought", () => {
  // Dropping the lead here would leave Details opening on ", plus per-set load
  // adequacy" -- a fragment. Only a colon seam yields a standalone clause.
  const d =
    "Total ampacity of N paralleled conductor sets with the NEC more-than-three " +
    "current-carrying-conductor derate applied, plus per-set load adequacy for 1/0 AWG " +
    "and larger sets, which is where the paralleling rule starts to apply at all.";
  assert.equal(restOfDescription(d), d);
});

test("no public lead ends on an unclosed bracket", () => {
  const broken = [];
  for (const t of TOOLS) {
    const lead = leadSentence(t.desc);
    let depth = 0;
    for (const ch of lead) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    if (depth !== 0) broken.push(t.id);
  }
  assert.deepEqual(broken, []);
});

test("no public lead opens with maintainer vocabulary", () => {
  const jargon = /\b(tile|tiles|sibling|siblings|leaves out|never covered|the catalog)\b/i;
  // Ceramic tile is the actual subject of these; "tile" is the trade word.
  const ceramic = new Set([
    "tile-count", "thinset-coverage", "cement-board-takeoff",
    "flooring-takeoff", "pool-tile-coping-perimeter",
  ]);
  const offenders = TOOLS
    .filter((t) => !ceramic.has(t.id) && jargon.test(leadSentence(t.desc)))
    .map((t) => t.id);
  assert.deepEqual(offenders, []);
});

test("no public lead prints a raw tile id", () => {
  const slugs = TOOLS.map((t) => t.id).filter((id) => (id.match(/-/g) || []).length >= 2);
  // Terms that are real trade vocabulary as well as tile ids.
  const vocabulary = new Set(["cash-on-cash", "mean-piston-speed"]);
  const offenders = [];
  for (const t of TOOLS) {
    const lead = leadSentence(t.desc);
    for (const id of slugs) {
      if (id === t.id || vocabulary.has(id)) continue;
      if (new RegExp("(^|[^a-z-])" + id + "([^a-z-]|$)").test(lead)) offenders.push(t.id + " -> " + id);
    }
  }
  assert.deepEqual(offenders, []);
});

// The prose below the answer is public too -- it renders in the shell Details
// block and the live detail paragraph. It was cleaned in the same pass as the
// leads; these two assertions keep it clean.

test("no description body prints a raw tile id", () => {
  const slugs = TOOLS.map((t) => t.id).filter((id) => (id.match(/-/g) || []).length >= 2);
  // Terms that are real trade vocabulary as well as tile ids.
  const vocabulary = new Set(["cash-on-cash", "mean-piston-speed", "required-fire-flow"]);
  const offenders = [];
  for (const t of TOOLS) {
    const body = restOfDescription(t.desc);
    if (!body) continue;
    for (const id of slugs) {
      if (id === t.id || vocabulary.has(id)) continue;
      if (new RegExp("(^|[^a-z-])" + id + "([^a-z-]|$)").test(body)) offenders.push(t.id + " -> " + id);
    }
  }
  assert.deepEqual(offenders, []);
});

// The two raw-slug assertions above only scan ids carrying two or more hyphens,
// because a one-hyphen id is usually ordinary trade vocabulary too ("three-phase",
// "lumen-method"). That left a hole: "(see conduit-fill)" reads as a slug and shipped
// on a public page. A cross-reference is the one place the intent is unambiguous, so
// check every id there regardless of shape.
test("no description points a reader at a raw slug", () => {
  const ids = new Set(TOOLS.map((t) => t.id));
  const offenders = [];
  for (const t of TOOLS) {
    for (const m of t.desc.matchAll(/\bsee ([a-z0-9]+(?:-[a-z0-9]+)+)/g)) {
      if (ids.has(m[1])) offenders.push(t.id + " -> see " + m[1]);
    }
  }
  assert.deepEqual(offenders, []);
});

// The two scans above only look at ids with 2+ hyphens, on the reasoning that
// a one-hyphen id is usually trade vocabulary as well ("three-phase",
// "expansion-tank", "combustion-air") and reads fine in prose. That holds --
// except when half the id is an acronym. "The QMD reineke-sdi requires",
// "Defers head to pump-tdh", "The efficiency seer-eer never reads" and six
// more shipped on public pages, each one a machine name a reader cannot say
// out loud. Name the calculator in words instead.
test("no description prints a one-hyphen slug that is half acronym", () => {
  const ACRONYM = /^(?:sas|sss|asa|ssa|sdi|tdh|spl|edr|npk|eer|seer|tpa|qmd|cop|dfu|adpi|rt60|nff|pdp|svi|ct|ua|io)$/;
  const slugs = new Set(TOOLS.map((t) => t.id).filter((id) => id.split("-").some((p) => ACRONYM.test(p))));
  const offenders = [];
  for (const t of TOOLS) {
    for (const m of t.desc.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b/g)) {
      if (slugs.has(m[1]) && m[1] !== t.id) offenders.push(t.id + " -> " + m[1]);
    }
  }
  assert.deepEqual(offenders, []);
});

test("no description body calls a calculator a tile or a sibling", () => {
  const jargon = /\b(tile|tiles|sibling|siblings|never covered|the catalog)\b/i;
  // Ceramic tile is the actual subject in these; ADPI's "catalog throw" is the
  // diffuser manufacturer's catalog, not ours.
  const exempt = new Set([
    "tile-count", "thinset-coverage", "cement-board-takeoff", "flooring-takeoff",
    "pool-tile-coping-perimeter", "suspended-ceiling-grid", "shower-compartment-check",
    "adpi-diffuser-selection",
  ]);
  const offenders = TOOLS
    .filter((t) => !exempt.has(t.id) && jargon.test(restOfDescription(t.desc)))
    .map((t) => t.id);
  assert.deepEqual(offenders, []);
});

// A description whose next sentence is a formula puts its subject on the left
// of an equals sign, in lower case, so the uppercase rule alone welds the two
// together and the reader's one line opens with algebra.
test("firstSentence ends in front of a sentence that opens on a formula", () => {
  assert.equal(
    firstSentence("The sun's elevation angle above the horizon. sin(altitude) = sin(lat) sin(dec)."),
    "The sun's elevation angle above the horizon.",
  );
  assert.equal(
    firstSentence("How much outside air a unit is really pulling. %OA = 100 (T_ra - T_ma) / (T_ra - T_oa)."),
    "How much outside air a unit is really pulling.",
  );
  // Still not a split: a unit abbreviation followed by ordinary prose.
  assert.equal(
    firstSentence("Head loss across a valve of at least 3 in. of head is what governs here."),
    "Head loss across a valve of at least 3 in. of head is what governs here.",
  );
});

// The one line under the title is the whole page for a reader who is deciding
// whether this is the right calculator. An equation cannot answer that: "ACH =
// CFM x 60 / volume" names no room, no problem, and no unit the reader is
// holding. The formula is never lost -- it is one tap away in the collapsed
// block, which prints it, its source, and its assumptions. So a lead may name
// a quantity in words ("Debt yield = NOI / loan") but may not open on a bare
// symbol: an acronym, a subscripted variable, or anything with a digit in it.
test("no public lead opens on a bare symbolic variable", () => {
  const opener = /^([A-Za-z%][A-Za-z0-9_,%'./-]*)(\s*\([^)]*\))?\s*[=~]\s/;
  const symbolic = (tok) =>
    /[0-9_,%'/]/.test(tok) || tok.length < 4 || tok === tok.toUpperCase();
  const offenders = [];
  for (const t of TOOLS) {
    const m = leadSentence(t.desc).match(opener);
    if (m && symbolic(m[1])) offenders.push(`${t.id} -> ${m[1]}`);
  }
  assert.deepEqual(offenders, []);
});

// The one line is the summary; the equation belongs under the disclosure that
// prints it with its source. A lead that says both is spending half its width
// on the half a reader cannot act on.
test("a lead that names the thing in words drops the equation trailing it", () => {
  assert.equal(
    leadSentence("The rise of an arc from a known radius and chord, rise = R - sqrt(R^2 - (chord/2)^2). More."),
    "The rise of an arc from a known radius and chord.",
  );
  // Details picks up exactly where the lead stopped, so the equation is one
  // tap away rather than gone from the page.
  assert.match(
    restOfDescription("The rise of an arc from a known radius and chord, rise = R - sqrt(R^2 - (chord/2)^2). More."),
    /^rise = R - sqrt/,
  );
  // A lead that was always algebra is left alone: cutting it yields more
  // algebra, not fewer symbols.
  assert.equal(
    leadSentence("Q = C i A peak runoff in cfs and gpm, with bundled C values for the site."),
    "Q = C i A peak runoff in cfs and gpm, with bundled C values for the site.",
  );
  // A seam mid-list is not a formula seam: cutting there would drop RPM from
  // a lead that just named the other two.
  assert.equal(
    leadSentence("Horsepower, kilowatts, and a selector across HP, torque, and RPM via HP = Torque * RPM / 5252."),
    "Horsepower, kilowatts, and a selector across HP, torque, and RPM via HP = Torque * RPM / 5252.",
  );
});

// Nothing asserted the cap over the catalog. text-lead.js enforced it on
// itself, this file's copy of the number had drifted to 160, and the one
// assertion using it ran against a single hand-written sentence. A splitter
// regression is visible on 1,804 public pages at once.
test("no public lead overruns the cap", () => {
  const over = TOOLS
    .map((t) => [leadSentence(t.desc).length, t.id])
    .filter(([n]) => n > LEAD_MAX)
    .sort((a, b) => b[0] - a[0]);
  assert.deepEqual(over, [], `leads past ${LEAD_MAX} chars: ${over.map(([n, id]) => `${id}=${n}`).join(", ")}`);
});

test("the leads that sit at the cap are the five known seam cases", () => {
  // Pinned by name so a splitter change that quietly adds a sixth is visible,
  // and so removing one is a deliberate edit rather than a silent drift.
  const atMax = TOOLS.filter((t) => leadSentence(t.desc).length === LEAD_MAX).map((t) => t.id).sort();
  assert.deepEqual(atMax, [
    "block-redirect-max-angle",
    "off-grid-battery",
    "parabolic-segment",
    "scaffold-platform-check",
    "steam-boiler-blowdown",
  ]);
});

test("the mean lead stays well inside the cap", () => {
  // The cap is the ceiling; the design target is a line a reader takes in at a
  // glance. Mean was 103 before the 2026-08-18 enforcement pass and is 80 now.
  const mean = TOOLS.reduce((a, t) => a + leadSentence(t.desc).length, 0) / TOOLS.length;
  assert.ok(mean < 90, `mean lead ran to ${mean.toFixed(1)} chars`);
});
