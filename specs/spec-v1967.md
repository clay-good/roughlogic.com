# spec-v1967.md -- The corrections log

> **Status: LANDED (2026-10-17). Platform spec, no tile added. Roadmap pillar 6 of [spec-v106](spec-v106.md) section 7, "public errata log: an open record of every formula correction; integrity over a perfection claim."** Catalog stays at **2,267**.

## What it does for you

A new page at `/errata/`, linked from the footer of every static page, lists every fix the changelog records that names a calculator: 410 entries, newest first. Each entry gives its title and the calculators it names. A link goes to the full write-up of what was wrong, how it was fixed, and how the fix was proved. Nothing is selected or softened: the whole record is there.

## What counts as an entry

A bullet under a `### Fixed` heading in [CHANGELOG.md](../CHANGELOG.md) that names at least one live calculator id in backticks. The rule is mechanical, so the log never decides which fixes matter.

The log does **not** claim that a named calculator was changed, and the calculator pages carry no "corrected N times" line. That was the first design, and it would have told readers things that are false. The CHANGELOG does not record which tiles a fix changed, and a bullet often names a tile for another reason:
- it checked the tile and found it right (slice 59 names `rain-on-snow-surcharge`, which it confirmed and left alone);
- it fixed a search or page behavior around the tile (an entry naming `pipe-volume` fixed how a typed query filled the wire-ampacity form).

A per-calculator count built on mentions would have said `pipe-volume`'s math was corrected when it never was. Two tighter mechanical rules were measured, and both failed:
- **Title names a tile:** keeps 195 of 410 entries, but drops real formula fixes ("Lighting power density allowed 56% more light than the code it cited", "The radon pipe loss used Blasius outside its range") and keeps wording fixes.
- **"Tiles affected" line:** used once in the whole file.

So each entry says what it **names**, and the page explains that a calculator appearing there is not by itself a sign its answer was wrong. A true per-calculator correction count would need the CHANGELOG to record, from now on, which tiles each fix changed. That is a writing convention for the maintainer to adopt, not something to infer.

## Dates, stated honestly

Every entry so far sits under the CHANGELOG's "Unreleased" heading; the project has not cut a numbered release since v0.8.0. So entries carry no per-entry date. They are listed newest first, the CHANGELOG's own order, and the page says exact dates are in the CHANGELOG's history. No date is inferred. Entries under a dated release heading show that date. Anchors (`#fix-N`) are numbered from the oldest entry, so a new entry takes the next number and existing links never move.

## Size

The page shows each title and its calculators, about 55 KB gzipped. The full write-ups (about 400 KB) stay in the CHANGELOG.

## Proof

`test/unit/errata.test.js`:
- runs the parser on the real CHANGELOG and checks its entry count against a second, independent reading of the file;
- checks anchors are contiguous from the oldest, and every entry names a live calculator;
- checks the page carries every anchor and never says "changed" or "corrected N times".

Making the parser silently drop a class of entries turns it red. `check-shells` also learned cross-page anchors: a link like `/errata/#fix-41` must match an id in that page, while a link to the home document's hash is still checked as an app route. Both rules were seeded red.
