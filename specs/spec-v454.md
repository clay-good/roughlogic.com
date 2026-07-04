# roughlogic.com Specification v454 -- Multi-Bend Flat Pattern (Developed Length) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the fabrication-layout trio (v453 intermittent fillet weld -> v454
> multi-bend flat pattern -> v455 bend deduction). `bend-allowance` develops a single bend; a real part -- a channel, a hat
> section, a bracket -- has several bends, and its flat blank is the sum of the mold-line dimensions less the bend deduction
> at every bend.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To cut the flat blank for a part with `N` bends, a
> brake operator sums the outside (mold-line) flange dimensions and subtracts a bend deduction at each bend:
> `flat = sum_of_mold_line - N * BD` (for identical bends, or the sum of the per-bend deductions). `bend-allowance` handles
> one bend; nothing chains the deductions across a multi-bend part. This adds the flat-pattern tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v453.md.
>
> **The gap, and the evidence for it.** A U-channel with `2 in`, `4 in`, and `2 in` outside flanges (`8 in` of mold-line)
> and two `90 deg` bends at `R = 0.125 in`, `T = 0.0625 in` has a bend deduction of `0.1355 in` each, so the flat blank is
> `8 - 2 * 0.1355 = 7.73 in`. Cut it longer and the finished channel is oversized; the deduction at every bend is why a flat
> blank is always shorter than the sum of the outside dimensions. No tile does this; `bend-allowance` gave one bend and the
> operator added the rest by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The mold-line length, the bend
deduction, and the flat length are lengths (in); the bend count is dimensionless. The v18/v21 contract: any non-finite
input, or a non-positive mold-line length or bend count, or a total deduction exceeding the mold-line length, returns
`{ error }`; the tile subtracts the bend deduction at each bend (uniform, or a supplied total) from the mold-line sum.
Citation discipline (v19/v22): `GOVERNANCE.general` over the multi-bend flat pattern by name; `editionNote` names **the
press-brake developed-length method `flat = sum_of_mold_line - sum_of_bend_deductions` (the mold-line is the outside
flange-to-flange dimension summed, and the bend deduction `BD` per bend comes from `bend-deduction-setback`), and that the
neutral-axis / bend-allowance method gives the same result by a different bookkeeping**, and states that **this returns the
flat blank length for a multi-bend part, that mixed bend radii/angles use the sum of individual deductions, and that it is a
layout aid, not a substitute for a CAD flat pattern or a test bend**.

## 2. The tile

### 2.1 `multi-bend-flat-pattern` -- Multi-Bend Flat Pattern (Developed Length)

```
inputs:
  mold_line_in   in   sum of outside (mold-line) flange dimensions
  n_bends        -    number of bends
  bd_in          in   bend deduction per bend (from bend-deduction-setback)

flat_in = mold_line_in - n_bends * bd_in
```

**Pinned worked example (U-channel: 2 + 4 + 2 = 8 in mold-line, 2 bends, BD 0.1355 in).**
`flat = 8 - 2 * 0.1355 = 7.73 in`. **Cross-check (a hat section).** Four bends at the same `0.1355 in` deduction over a
`12 in` mold-line give `flat = 12 - 4*0.1355 = 11.46 in` -- more bends, more material pulled out of the blank. A total
deduction exceeding the mold-line, or a non-positive input, takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `bend-allowance`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the multi-bend flat pattern, `editionNote` naming the mold-line-minus-deductions
relation and the bend-deduction source); `test/fixtures/worked-examples.json` (the U-channel example + the hat-section
cross-check); `test/fixtures/compute-map.js` (`multi-bend-flat-pattern` -> `computeMultiBendFlatPattern` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `bend-allowance` / `bend-deduction-setback` / `rolled-blank` /
`cone-flat-pattern`); `data/search/aliases.json` ("flat pattern", "multi bend flat pattern", "developed length", "sheet
metal blank", "bend deduction total", "flat blank multiple bends", "press brake flat", "channel flat pattern", "bend
allowance multiple"); the id appended to the existing construction renderers block in `app.js`; the `// dims:` annotation
(lengths length, count dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the deduction-exceeds guard, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the flat-length output wraps on a phone); render-no-nan + a11y
sweep, output read to the value (8 in mold-line, 2 bends -> 7.73 in).

## 5. Roadmap position

The middle of the fabrication-layout trio: `intermittent-fillet-weld` (v453) and `bend-deduction-setback` (v455) bracket it,
the latter supplying the per-bend deduction this tile sums. A per-bend mixed-radius entry and a K-factor-from-a-test-bend
back-solver are the deliberate next follow-ons.
