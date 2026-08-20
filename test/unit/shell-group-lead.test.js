// The one line on a group hub prints the group's name mid-sentence, so the
// name has to be lower-cased -- but a blanket toLowerCase shipped "154
// calculators for hvac", "28 calculators for field, backcountry, and sar",
// and "29 calculators for educators and k-12" on three public pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sentenceCase } from "../../scripts/build-shells.mjs";

test("sentenceCase lower-cases ordinary words and leaves names alone", () => {
  assert.equal(sentenceCase("HVAC"), "HVAC");
  assert.equal(sentenceCase("Field, Backcountry & SAR"), "field, backcountry & SAR");
  assert.equal(sentenceCase("Educators & K-12"), "educators & K-12");
  assert.equal(sentenceCase("Accounting, Tax & Small-Business"), "accounting, tax & small-business");
  assert.equal(sentenceCase("Mechanic - Auto, Marine, Aviation"), "mechanic - auto, marine, aviation");
});
