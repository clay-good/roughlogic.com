// A worked example whose every numeric answer is zero teaches nothing.
// air-receiver -- a receiver SIZING tile -- printed "Receiver: 0 ft3";
// traverse-closure printed 0.000 ft misclosure, which suppressed the 1:N
// relative precision entirely. check-shells now fails on that shape, so the
// whole risk is in telling a real zero from a string that merely looks like
// one. That is what these pin.
import test from "node:test";
import assert from "node:assert/strict";
import { soleNumber, answerRows } from "../../scripts/check-shells.mjs";

test("a printed number reads as its number", () => {
  assert.equal(soleNumber("0"), 0);
  assert.equal(soleNumber("0.00 A"), 0);
  assert.equal(soleNumber("0.1"), 0.1);
  assert.equal(soleNumber("25.98 A"), 25.98);
  assert.equal(soleNumber("9,999"), 9999);
  assert.equal(soleNumber("-4.5 SCFM"), -4.5);
});

test("an answer that is not simply a number is never read as zero", () => {
  // Every one of these was flagged by the first draft of this sweep.
  for (const v of ["AUGGCCUAA", "drywall", "high_cost", "Level III", "optional", "2-4", ""]) {
    assert.equal(soleNumber(v), null, `${JSON.stringify(v)} should not parse as a number`);
  }
});

test("answerRows reads the You get block and nothing else", () => {
  const html = `<p class="shell-io-label">You enter</p><ul class="shell-io">` +
    `<li><span>Phase A current (A)</span> <b>100</b></li></ul>` +
    `<p class="shell-io-label">You get</p><ul class="shell-io">` +
    `<li><span>Neutral current</span> <b>25.98 A</b></li>` +
    `<li><span>Imbalance %</span> <b>35.29 %</b></li></ul>`;
  assert.deepEqual(answerRows(html), [
    { label: "Neutral current", value: "25.98 A" },
    { label: "Imbalance %", value: "35.29 %" },
  ]);
  assert.deepEqual(answerRows("<p>no example here</p>"), []);
});

test("the degenerate shape is exactly all-numeric-answers-zero", () => {
  const allZero = ["0", "0.00 A", "0.0 %"].map(soleNumber);
  assert.ok(allZero.every((n) => n === 0));
  const mixed = ["0", "25.98 A"].map(soleNumber);
  assert.ok(!mixed.every((n) => n === 0), "a zero beside a real answer is fine");
  // A reference tile with no numeric answer at all is not judged.
  const none = ["Level III", "optional"].map(soleNumber).filter((n) => n !== null);
  assert.equal(none.length, 0);
});
