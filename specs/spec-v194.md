# roughlogic.com Specification v194 -- Carpet and Cushion Restore-vs-Replace Decision Reference (IICRC S500) (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v188..v196 (water-damage restoration).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one reference tile mapping water category, the
> affected component (carpet vs cushion), and delamination to the IICRC S500 restore-vs-replace
> decision. Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency.
> Inherits spec.md through spec-v187.md.
>
> **The gap, and the evidence for it.** The catalog classifies the loss (`water-classes`) and the mold
> condition (`mold-conditions`), but never the most common flooring call on a water job: can this
> carpet and its cushion be dried and saved, or do they come out. The answer is a clean S500 matrix --
> category, component, and delamination -- and the catalog has the inputs but no tile that returns the
> decision.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `water-classes` / `mold-conditions` pattern): water category, component,
and a delamination flag select a row; the output is a restore-vs-replace decision string with its
rationale. There is no numeric computation. The v18/v21 contract: an unrecognized category or
component returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
restore-vs-replace mapping, by name; `editionNote` names ANSI/IICRC S500 and states that the decision
is a professional determination case by case (age, condition, contamination, customer agreement, and
the AHJ all bear on it), that delaminated carpet is replaced, that cushion (pad) saturated in any
category is typically removed because replacement costs less than drying, and that Category 3
porous flooring materials are generally removed and disposed.

## 2. The tile

### 2.1 `carpet-restore-replace` -- S500 Carpet / Cushion Restore-vs-Replace Lookup

```
inputs:
  water_category   select   "Category 1 (clean)" | "Category 2 (gray)" | "Category 3 (black)"
  component        select   "carpet" | "cushion/pad"
  delaminated      dimensionless  0/1 -- carpet delamination present

decision = S500 matrix:
  Category 1, carpet, not delaminated  -> may be dried in place or floated and restored
  Category 1, cushion                  -> typically remove/replace (replacement < cost to dry)
  Category 2, carpet                   -> restorable case-by-case after cleaning/sanitizing; cushion out
  Category 3, carpet or cushion        -> remove and dispose (not restorable)
  any, carpet, delaminated == 1        -> replace (delamination)
```

**Pinned worked example.** A **Category 1** loss on **carpet** that is not delaminated: the carpet
**may be dried in place or floated and restored**, while the saturated **cushion underneath is
typically removed and replaced** because replacing pad costs less than drying it. **Cross-check
(Category 3).** A **Category 3** (black-water/sewage) loss: both the **carpet and cushion are removed
and disposed of** as non-restorable; and in any category, **delaminated** carpet is replaced. The
decision is case-by-case; the restorer's judgment, customer agreement, and S500 govern.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the restore-vs-replace matrix, `editionNote` naming
ANSI/IICRC S500 and the case-by-case / delamination / Category-3 caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`carpet-restore-replace` -> `computeCarpetRestoreReplace` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `water-classes` / `flood-cut-quantity` / `mold-conditions`);
`data/search/aliases.json` ("carpet replace", "pad replace", "restore or replace", "carpet
delamination", "cushion removal", "category 3 carpet"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the Category 1 example, the Category 3 and
delamination cross-checks, and the unrecognized-input error seam. Raise the `calc-restoration.js`
size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the delamination override); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
decision and rationale wrap on a phone); render-no-nan + a11y sweep, output read to the value (Cat 1
carpet -> dry/restore, pad replace; Cat 3 -> remove both).

## 5. Roadmap position

Turns the `water-classes` category into the flooring decision it drives, alongside
`flood-cut-quantity`. Further Group D growth stays evidence-driven.
