// The description splitter behind every public lead: the shell lead, the live
// .view-desc, the group-hub row, and the meta description. A regression here
// is visible on 1,709 public pages at once, so the contract is pinned.

import { test } from "node:test";
import assert from "node:assert/strict";
import { firstSentence, leadSentence, restOfDescription } from "../../text-lead.js";
import { TOOLS } from "../../tools-data.js";

const LEAD_CAP = 160;

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

test("restOfDescription keeps every word when the lead is a clause cut", () => {
  const d =
    "The specific-energy diagram of an open channel: E = y + q^2/(2 g y^2) is the flow " +
    "energy measured from the bed, and for one discharge the same E passes at two alternate depths.";
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
