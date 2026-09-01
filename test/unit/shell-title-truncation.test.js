// The <title> is the blue link text in a search result and the label on the
// browser tab. A tile name over the 70-character cap gets an ellipsis, and the
// cut used to land wherever the character loop stopped: 86 of the 133
// truncated titles ended mid-word ("ASCE 7 ASD Load Combinations: Governing
// Demand and Ne...", "Compressor Volumetric Efficiency (Clearance
// Re-Expans..."). The only title gate was the 70-character cap, which a
// mid-word cut passes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { truncateName } from "../../scripts/build-shells.mjs";

const NAME = "ASCE 7 ASD Load Combinations: Governing Demand and Net Uplift";

test("a name that fits is returned whole", () => {
  assert.equal(truncateName("Ohm's Law", 60), "Ohm's Law");
});

test("the ellipsis lands after a whole word, never inside one", () => {
  for (let budget = 20; budget <= NAME.length; budget++) {
    const kept = truncateName(NAME, budget);
    if (kept === NAME) continue;
    assert.ok(NAME.startsWith(kept), `budget ${budget}: "${kept}" is not a prefix of the name`);
    const next = NAME[kept.length];
    const cutsAWord = /[A-Za-z0-9]/.test(kept.at(-1) || "") && /[A-Za-z0-9]/.test(next || "");
    assert.equal(cutsAWord, false, `budget ${budget} cut mid-word: "${kept}" then "${NAME.slice(kept.length, kept.length + 8)}"`);
  }
});

test("a cut inside an unclosed parenthetical backs off to before it", () => {
  // "Accessible Shower Compartment Types (2010 ADA Standards 608.2)" cut at 53
  // used to read "...Types (2010 ADA Standar" -- an opened bracket the title
  // never closes.
  const name = "Accessible Shower Compartment Types (2010 ADA Standards 608.2)";
  const kept = truncateName(name, 53);
  assert.equal(kept, "Accessible Shower Compartment Types");
  assert.ok(!kept.includes("("), "kept text still opens a parenthetical it does not close");
});

test("a closed parenthetical inside the kept text is left alone", () => {
  const name = "Rankine Active Earth Pressure on a Cohesive (Clay) Backfill Wedge";
  const kept = truncateName(name, 55);
  assert.ok(kept.includes("(Clay)"), `dropped a balanced parenthetical: "${kept}"`);
});

test("the back-offs never eat most of the name", () => {
  // A name whose first space falls late must still yield something a reader
  // can recognise, rather than collapsing to a couple of characters.
  const name = "Electroencephalographically Determined Threshold Value";
  const kept = truncateName(name, 40);
  assert.ok(kept.length > 16, `collapsed to ${kept.length} characters: "${kept}"`);
});

test("the cap is measured with the caller's length function", () => {
  // buildTitle passes an escaped-length measure, because a name with an
  // apostrophe escapes to more bytes than its raw form.
  const escLen = (s) => s.replace(/'/g, "&#39;").length;
  const name = "Concrete f'c from Modulus of Elasticity (ACI 318-19 19.2.2)";
  const kept = truncateName(name, 40, escLen);
  assert.ok(escLen(kept) <= 40, `escaped length ${escLen(kept)} exceeds the 40 budget`);
});
