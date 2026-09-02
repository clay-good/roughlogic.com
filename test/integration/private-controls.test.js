// AGENTS.md states the rule: "Any identity, contact, address, credential,
// payment, or other private/free-prose control must set
// `data-report-sensitive="true"`. Private controls must never be serialized
// into URL state, report inputs, or derived output snapshots."
//
// One control in the catalog is such a field: the crew member's Name on the
// Tip-Out tile, which a bartender types real people into. Everything else that
// takes free text is naming an ingredient, a light fixture or a hazmat item.
//
// The mechanism -- `isPrivateControl` in hash-state.js, and the report
// collectors that call it -- is unit-tested against a mock DOM. What was not
// tested is the sentence above, end to end, in a browser: type a name into the
// real tile and check it reaches neither the URL nor the report payload. Those
// are the two ways a value leaves the reader's control -- the URL because it is
// shareable and lands in browser history, the payload because it is the one
// thing on this site that crosses the network.
//
// A mock cannot catch a renderer that forgets the attribute, or a hash writer
// that reads the DOM by a path the mock does not model. This can.

import { test, expect } from "@playwright/test";

const PERSON = "Jane Q Doe";

async function fillTipOut(page) {
  await page.goto("/#tip-out");
  await page.waitForSelector("#to-n-0", { timeout: 15_000 });
  await page.fill("#to-n-0", PERSON);
  await page.fill("#to-h-0", "8");
  // The hash writer is debounced; give it more than one debounce to run.
  await page.waitForTimeout(800);
}

test("private controls: a person's name never reaches the URL", async ({ page }) => {
  await fillTipOut(page);
  // The non-private sibling DOES round-trip, which is what makes this a test of
  // the exclusion rather than of a hash writer that simply never ran.
  await expect
    .poll(() => decodeURIComponent(page.url()), { timeout: 10_000 })
    .toContain("to-h-0=8");
  const url = decodeURIComponent(page.url());
  expect(url, "the crew member's name was written into the shareable URL").not.toContain(PERSON);
  expect(url).not.toContain("to-n-0");
});

test("private controls: a person's name never reaches the report payload", async ({ page }) => {
  await fillTipOut(page);

  const payload = await page.evaluate(async (person) => {
    const mod = await import("/report-feedback.js");
    const built = mod.buildReportPayload({
      tool: { id: "tip-out", name: "Tip-Out" },
      inputRegion: document.querySelector(".input-region"),
      outputRegion: document.querySelector(".output-region"),
      note: "the note the reader typed",
      token: "test-token",
    });
    return {
      json: JSON.stringify(built),
      sanitizedUrl: mod.sanitizedReportUrl(document.querySelector(".input-region"), location.href),
      hasPerson: JSON.stringify(built).includes(person),
    };
  }, PERSON);

  expect(payload.hasPerson, `the report payload carried the name: ${payload.json.slice(0, 400)}`).toBe(false);
  expect(payload.sanitizedUrl).not.toContain(PERSON);
  // docs/calculator-reports.md: "if any private control exists, the rendered
  // output snapshot is omitted so a derived result cannot repeat or transform
  // identity data." A split is a function OF the names beside it, so an answer
  // can carry what the field did not.
  expect(payload.json, "the output snapshot was sent from a tile carrying a private field")
    .toContain("Output omitted because this calculator contains a private field");
  // Again, the sibling value proves the collector was actually collecting.
  expect(payload.json, "the payload collected no inputs at all, so the check above proves nothing").toContain("8");
});

test("private controls: the name survives a reload only if the reader retypes it", async ({ page }) => {
  // The flip side of keeping it out of the URL, stated so nobody "fixes" it:
  // the value is deliberately not restorable from a shared link.
  await fillTipOut(page);
  const url = page.url();
  // A goto that changes only the fragment is a same-document navigation and
  // keeps the field values; this has to be a real document load, the way
  // opening a shared link is.
  await page.goto("about:blank");
  await page.goto(url);
  await page.waitForSelector("#to-n-0", { timeout: 15_000 });
  await page.waitForTimeout(500);
  // Not empty: the tile refills its own example value ("A"). What matters is
  // that the reader's value is gone, and that the sibling came back from the
  // URL -- so this is the private field being excluded, not a link that
  // restored nothing.
  await expect(page.locator("#to-n-0")).not.toHaveValue(PERSON);
  await expect(page.locator("#to-h-0")).toHaveValue("8");
});
