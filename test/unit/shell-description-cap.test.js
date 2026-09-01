// A meta description over the 220-character cap gets an ellipsis, and that
// string is what the search snippet, og:description, twitter:description and
// the JSON-LD description all carry. The cap loop used to shave four raw
// characters at a time and append "..." wherever it landed, so 734 of 1,804
// tile pages advertised themselves with a cut-off word -- "...flags expec...".
// The only description gate was the 220-char cap, which a mid-word cut passes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { capDescription, DESCRIPTION_CAP } from "../../scripts/build-shells.mjs";

const LONG =
  "Compute the chi-square goodness-of-fit statistic as the sum of (observed " +
  "minus expected) squared over expected on k-1 degrees of freedom, take the " +
  "p-value from the chi-square cumulative distribution, and return a reject " +
  "or fail-to-reject verdict at the chosen alpha level.";

test("a description within the cap is returned untouched", () => {
  const short = "Compute V, I, R, or P from any two known values.";
  assert.equal(capDescription(short), short);
});

test("a capped description stays within the cap", () => {
  assert.ok(capDescription(LONG).length <= DESCRIPTION_CAP);
});

test("the ellipsis lands after a whole word, never inside one", () => {
  // Walk a window of source lengths so the cut point sweeps across word
  // boundaries and through the middle of words; every landing must be clean.
  for (let extra = 0; extra < 60; extra++) {
    const source = LONG.slice(0, DESCRIPTION_CAP + 1 + extra);
    const out = capDescription(source);
    if (!out.endsWith("...")) continue;
    const stem = out.slice(0, -3);
    // The next character in the source after the stem must not continue the
    // word the stem ends on.
    const next = source[stem.length];
    const cutsAWord = /[A-Za-z0-9]/.test(stem.at(-1) || "") && /[A-Za-z0-9]/.test(next || "");
    assert.equal(cutsAWord, false, `cut mid-word at +${extra}: "...${stem.slice(-30)}" then "${source.slice(stem.length, stem.length + 10)}"`);
  }
});

test("the cap is measured after HTML escaping, not before", () => {
  // A quote or ampersand costs five or six characters once escaped, so a
  // raw-length cap lets the rendered attribute slip past 220.
  const quoted = 'Compute the "design" & "service" load for a run of '.repeat(6);
  const out = capDescription(quoted);
  const escaped = out
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  assert.ok(escaped.length <= DESCRIPTION_CAP, `escaped length ${escaped.length} exceeds ${DESCRIPTION_CAP}`);
});

test("a single unbroken token still yields something, not an empty string", () => {
  // No space to back off to; the word-boundary rule must not collapse the
  // description to bare punctuation.
  const out = capDescription("x".repeat(400));
  assert.ok(out.length > 100, `collapsed to ${out.length} characters`);
  assert.ok(out.endsWith("..."));
});

// The snippet a searcher reads is the tile's own opening sentence. It used to
// be rewritten: a desc not opening with one of two dozen allowlisted verbs got
// "Reference for " glued on and its first letter lowercased -- 1,786 of 1,804
// tiles, producing "Reference for a stair that satisfies the building code can
// fail the ADA". Nothing may reintroduce a prefix.
test("the shell builder holds no description prefix", async () => {
  const src = await readFile(new URL("../../scripts/build-shells.mjs", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("function metaDescription("));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.doesNotMatch(body, /"Reference for "\s*\+/, "metaDescription prepends a prefix to the tile's desc");
  assert.doesNotMatch(body, /toLowerCase\(\)\s*\+\s*lead\.slice/, "metaDescription lowercases the desc's first letter");
});
