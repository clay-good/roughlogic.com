# spec-v1965.md -- Checked against: where each worked example comes from

> **Status: LANDED (2026-10-17). Platform spec, no tile added. Roadmap pillar 4 of [spec-v106](spec-v106.md) section 7, "annex-example verification, displayed".** Catalog stays at **2,267**.

## What it does for you

Every calculator's page shows a worked example: the inputs you type and the answer you get. Until now it never said where that example came from. Each page now says, in one line under the example, which published sources the calculator is checked against. If no published example covers the calculation, the line says so.

| The tile's registry rows | The line reads |
|---|---|
| at least one row from a named outside source | "Checked against published worked examples from: Copper Development Association; …" -- up to three distinct publishers, then "and N more" |
| only the project's own derivation, and held by an independent reference suite | "No published worked example is on file for this calculation. It is checked against a hand-worked derivation of its method and an independent reference test." |
| otherwise | the same, without the reference-test clause |

## Why the line is true

`test/fixtures/worked-examples.json` holds every tile's verified rows. The worked-example runner asserts each row against the tile's compute on every test run, so "checked against" describes something that actually runs. The reference-test clause appears only for the 360 derived-only tiles, which `spec-only-reference.test.js` guarantees a `calc-*.test.js` reference suite.

A source counts as **named** when its `source_publisher` starts with a capital letter, a digit or a parenthesis: 1,861 tiles. Fifty rows begin in lowercase because they name a method rather than a publisher ("one-way ANOVA (hand-computed, scipy cross-checked)"). Listing a method as though it were a publisher would overstate the evidence, so those tiles get the derivation sentence. Rows the worked-example lint already classes as self-sourced or recomputed (`Project (first-principles)`, "spec-vN worked example, recomputed") never count as outside sources.

## Where it shows

Only on the static page (`dist/tools/<id>/`), inside the Example section, so it also prints and is visible to search engines. The live calculator is unchanged; its citation line already names the formula and source. Shipping the registry to the browser would cost about 3 MB and is not worth it for a single line.

## Proof

`test/unit/checked-against.test.js` runs the line builder over all 2,267 tiles. Each named publisher in a line must appear in that tile's own registry rows. A tile with a named source must never get the "no published example" sentence. The reference-test clause must appear exactly on the derived-only tiles. A seeded wrong publisher turns it red.
