# roughlogic.com Specification v421 -- Cable Tray Fill for Large Single Conductors (NEC 392.22) (calc-electrical.js, Group A, 1 New Tile)

> **Status: CUT (2026-07-04, dupe of existing tile). NOT LANDED: v420 ev-charging-load duplicates the existing ev-charger-load (calc-solar.js, NEC 625.42 continuous load + panel impact); v421 cable-tray-fill is an EXACT id collision with the existing cable-tray-fill (calc-lowvoltage.js, NEC 392.22); v422 buck-boost-transformer-sizing duplicates the existing buck-boost-sizing (calc-electrical.js). The NEC electrical-installation space was already built out; this trio was proposed without a dupe-check against the live catalog. Original proposal below. Second tile of the NEC electrical-installation trio (v420 EV charging load -> v421 cable
> tray fill -> v422 buck-boost transformer). `conduit-fill` checks conductors in a raceway by cross-sectional percent; a
> cable tray uses a completely different rule, and no tile applies it.**
> In-scope catalog expansion under the spec-v106 trades-only charter. For single conductors `1/0 AWG` and larger in a ladder
> or ventilated cable tray, NEC 392.22(B)(1) limits the fill so the conductors sit in a single layer: the sum of the
> conductor outside diameters must not exceed the cable tray width. `conduit-fill` is the `40%` conduit rule, which does not
> apply to tray. This adds the tray-fill tile to the existing **`calc-electrical.js`** module (Group A); no new group, trade,
> or dependency. Inherits spec.md through spec-v420.md.
>
> **The gap, and the evidence for it.** Six `500 kcmil` single conductors (outside diameter about `0.813 in`) have a summed
> diameter of `6 * 0.813 = 4.88 in`, which fits a `6 in`-wide ladder tray with room to spare. Add two more of the same and
> the sum rises to `6.50 in`, over the `6 in` width, so the pull needs a wider tray. `conduit-fill` would give a meaningless
> answer here; tray fill is a width rule, not a percent-area rule. No tile does it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The tray width and the
conductor outside diameter are lengths (in); the conductor count is dimensionless; the summed diameter and remaining width
are lengths (in). The v18/v21 contract: any non-finite input, or a non-positive width, diameter, or count, returns
`{ error }`; the tile applies the single-conductor `1/0`-and-larger single-layer rule (`sum of diameters <= tray width`),
reports the summed diameter, the pass/fail, and the remaining width, and notes that multiconductor cables and conductors
smaller than `1/0` use the Table 392.22(A) cross-sectional-area method instead. Citation discipline (v19/v22):
`GOVERNANCE.general` over the NEC cable tray fill by name; `editionNote` names **NEC 392.22(B)(1) for single conductors
`1/0` and larger in ladder/ventilated tray (sum of conductor diameters `Sd <= tray width`, single layer), and the Table
392.22(A) multiconductor area method for smaller conductors -- NEC text quoted per the CF-01 disclosure**, and states that
**this returns the tray-width fill check for large single conductors, that multiconductor cables and small conductors use
the area method, that spacing/ampacity (392.80) is a separate check, and that it is a design aid, not a substitute for the
AHJ**.

## 2. The tile

### 2.1 `cable-tray-fill` -- Cable Tray Fill for Large Single Conductors (NEC 392.22)

```
inputs:
  tray_width_in   in   cable tray inside width
  conductor_od_in in   single-conductor outside diameter (1/0 AWG and larger)
  count           -    number of conductors

sd_in       = count * conductor_od_in
fits        = sd_in <= tray_width_in
remaining_in = tray_width_in - sd_in
```

**Pinned worked example (6 in tray, six 500 kcmil conductors at 0.813 in).** `Sd = 6*0.813 = 4.88 in`; `4.88 <= 6` -> fits,
`1.12 in` of width remaining. **Cross-check (two more conductors overflow).** Eight conductors give `Sd = 6.50 in > 6 in`
-> does not fit, go to a wider tray. A non-positive width, diameter, or count takes the error path; the non-finite seam is
covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `conduit-fill`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, NEC 392.22, `editionNote` naming the `Sd <= tray width` single-conductor rule
and the multiconductor area-method exception -- NEC text quoted per CF-01); `test/fixtures/worked-examples.json` (the fits
example + the overflow cross-check); `test/fixtures/compute-map.js` (`cable-tray-fill` -> `computeCableTrayFill` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `conduit-fill` / `conduit-jam-ratio` / `parallel-conductor-derate`
/ `ampacity`); `data/search/aliases.json` ("cable tray fill", "tray fill nec", "nec 392.22", "cable tray sizing", "sum of
diameters tray", "single conductor tray", "ladder tray fill", "cable tray width", "tray conductor fill"); the id appended to
the existing electrical renderers block in `app.js`; the `// dims:` annotation (widths/diameter length, count dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the fits/overflow boundary, and
the non-positive / non-finite error seams. No new module; re-pin `calc-electrical.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 NEC-
disclosure regex satisfied); `npm test` (+2 fixtures, the new fuzzer block, the fill boundary, the error paths);
`npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Sd /
fits / remaining set wraps on a phone); render-no-nan + a11y sweep, output read to the value
(6 in tray, six 0.813 in -> 4.88 in, fits).

## 5. Roadmap position

The middle of the NEC electrical-installation trio: `ev-charging-load` (v420) is the load and `buck-boost-transformer-sizing`
(v422) the transformer, while this handles the raceway. A Table 392.22(A) multiconductor area-fill mode and a 392.80 tray
ampacity companion are the deliberate next follow-ons.
