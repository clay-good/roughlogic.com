// The one line on a group hub. It sits directly under an <h1> that already
// names the group, so it must not name it again -- and both of its clauses
// have to agree with the tile count. The one-tile group shipped "1 calculator
// for historical reference data. Every one runs in your browser." on a public
// page: the name repeated from the heading, and a plural verb over a count
// of one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupLead } from "../../scripts/build-shells.mjs";

test("groupLead agrees with the count in both clauses", () => {
  assert.equal(groupLead(1), "1 calculator. It runs in your browser. Free, no account.");
  assert.equal(groupLead(206), "206 calculators. Every one runs in your browser. Free, no account.");
});

test("groupLead never names the group, whatever the label", () => {
  // Nothing in the sentence comes from the label, so no label can leak into
  // it -- which is what made "for hvac" / "for sar" / "for mechanic - auto,
  // marine, aviation" possible in the first place.
  for (const n of [1, 2, 29, 154, 466]) {
    assert.match(groupLead(n), /^\d+ calculators?\. (It|Every one) runs in your browser\. Free, no account\.$/);
  }
});
