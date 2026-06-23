# roughlogic.com Specification v170 -- Wireway / Auxiliary Gutter Sizing and 20% Fill (NEC 376.22) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile sizing a metal wireway (and, by the same
> rule, an auxiliary gutter) against the NEC 376.22 limits -- conductor cross-section no more than 20%
> of the wireway interior, and no more than 30 current-carrying conductors before ampacity adjustment.
> Adds one tile to **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits
> spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog fills conduit (`conduit-fill`, Chapter 9 40%) and
> cable tray (`cable-tray-fill`), but the wireway/gutter 20% rule is a distinct article (376.22 /
> 366.22) with its own conductor-count derating trigger at 30. Electricians lay out gutters above panel
> lineups constantly; nothing in the catalog checks the 20% area or flags the 30-conductor derate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
wireway width and height are `L` (in), the interior and conductor areas are `area` (in^2), the count
is a count, and the used percentage is `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive width or height, or a negative conductor area returns `{ error }`; the only division is
by the guarded-positive interior area for the percentage. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 376.22 (metal wireways: conductor fill and number of
conductors)`, `editionNote` `NEC_DISCLOSURE`, with the note that the same 20% rule applies to
auxiliary gutters (366.22), that the 30-conductor limit excludes signal and certain conductors per the
exceptions, and that exceeding 30 current-carrying conductors triggers Table 310.15(B)(3)(a) ampacity
adjustment rather than being prohibited.

## 2. The tile

### 2.1 `wireway-fill` -- Metal Wireway / Gutter 20% Fill and Conductor Count

```
inputs:
  width_in              L      interior width of the wireway
  height_in             L      interior height of the wireway
  conductor_area_in2    area   sum of the cross-sectional areas of all conductors (Chapter 9 Table 5)
  ccc_count             count  number of current-carrying conductors

interior_in2   = width_in x height_in
allowed_in2    = 0.20 x interior_in2
used_pct       = conductor_area_in2 / interior_in2 x 100
area_ok        = conductor_area_in2 <= allowed_in2
count_note     = ccc_count > 30 -> "over 30 CCC: apply 310.15(B)(3)(a) ampacity adjustment"
```

**Pinned worked example.** A 4 in x 4 in wireway carrying conductors summing 2.5 in^2, 18 CCC:
`interior = 16 in^2`; `allowed = 0.20 x 16 = 3.2 in^2`; `used = 2.5 / 16 = 15.6%` -> **within the 20%
fill**, and 18 conductors is at or under 30, so no adjustment. **Cross-check (both limits).** The same
4 in x 4 in wireway with conductors summing 3.5 in^2 exceeds `3.2 in^2` -> **over 20% fill**; and a
fill of 34 CCC, even if under area, flags the **30-conductor** ampacity-adjustment note. The AHJ
governs; signal conductors and the article exceptions are excluded from the count.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 376.22 (and 366.22 for gutters), the 20% area
and 30-conductor rules listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`wireway-fill` -> `computeWirewayFill` in `../../calc-electrical.js`); `scripts/related-tiles.mjs`
(-> `conduit-fill` / `cable-tray-fill` / `ambient-ampacity-adjust`); `data/search/aliases.json`
("wireway fill", "gutter fill", "376.22", "auxiliary gutter", "20 percent fill", "wireway sizing");
the id appended to the existing `ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the within-fill example,
the over-fill and over-30-count cross-checks, and error seams (non-finite, width/height <= 0, area <
0). Raise the `calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the over-fill and over-count paths); `npm run
build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit (the interior, allowed, and used-percent lines wrap on a phone); render-no-nan + a11y sweep,
output read to the value (4x4 / 2.5 in^2 -> 15.6%, within; 3.5 in^2 -> over; 34 CCC -> derate note).

## 5. Roadmap position

Completes the raceway-fill family (`conduit-fill`, `cable-tray-fill`) with the wireway/gutter 20%
rule. Further Group A growth stays evidence-driven.
