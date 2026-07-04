# roughlogic.com Specification v414 -- Consolidation Time Rate (Terzaghi) (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.145.0; proposed 2026-07-03). First tile of a geotechnical settlement/foundation trio (v414 consolidation time rate ->
> v415 SPT bearing capacity -> v416 liquefaction screening). `soil-consolidation-settlement` gives how much a clay layer
> will settle; this tile gives how long it takes -- the time rate a schedule and a surcharge program depend on.**
> In-scope catalog expansion under the spec-v106 trades-only charter. `soil-consolidation-settlement` explicitly computes
> only the magnitude of primary consolidation and states that the time rate is out of scope. Terzaghi's one-dimensional
> theory supplies the rate: for a target degree of consolidation `U`, the time factor is `Tv = (pi/4)*(U/100)^2` for
> `U <= 60%` and `Tv = 1.781 - 0.933*log10(100 - U)` above it, and the time is `t = Tv * Hdr^2 / cv`, where `Hdr` is the
> longest drainage path and `cv` the coefficient of consolidation. This adds the time-rate tile to the existing
> **`calc-geotech.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v413.md.
>
> **The gap, and the evidence for it.** A clay layer with `cv = 0.1 ft^2/day` and a `10 ft` drainage path reaches `90%`
> consolidation (`Tv = 0.848`) in `t = 0.848 * 10^2 / 0.1 = 848 days`, and it is already `50%` done (`Tv = 0.196`) at
> `196 days`. Those numbers decide whether a preload surcharge sits for six months or three years. No tile does this;
> `soil-consolidation-settlement` told you the settlement but not when it finishes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The degree of consolidation
`U` is dimensionless (percent); the coefficient of consolidation `cv` is an area per time (ft^2/day); the drainage path
`Hdr` is a length (ft); the time is a time (days). The v18/v21 contract: any non-finite input, or a non-positive `cv` or
`Hdr`, or a `U` outside `0 to 100` (exclusive of 100), returns `{ error }`; the tile uses the two-branch `Tv(U)` relation,
and `Hdr` is entered as the full layer thickness for single drainage or half for double drainage (a note flags the
distinction). Citation discipline (v19/v22): `GOVERNANCE.general` over Terzaghi consolidation time by name; `editionNote`
names **Terzaghi one-dimensional consolidation, the time factor `Tv = (pi/4)(U/100)^2` for `U <= 60%` and
`Tv = 1.781 - 0.933*log10(100-U)` above, the time `t = Tv*Hdr^2/cv`, `cv` from an oedometer test (ASTM D2435), and `Hdr` the
longest drainage path (full layer for single, half for double drainage)**, and states that **this returns the time to reach
a target degree of consolidation, that it is primary consolidation only (secondary creep is separate), and that it is a
design aid, not a substitute for the geotechnical engineer**.

## 2. The tile

### 2.1 `consolidation-time-rate` -- Consolidation Time Rate (Terzaghi)

```
inputs:
  u_percent   %         target degree of consolidation
  cv_ft2_day  ft^2/day  coefficient of consolidation
  hdr_ft      ft        longest drainage path (full layer single / half double)

Tv = (u_percent <= 60) ? (pi/4)*(u_percent/100)^2 : 1.781 - 0.933*log10(100 - u_percent)
t_days = Tv * hdr_ft^2 / cv_ft2_day
```

**Pinned worked example (U 90%, cv 0.1 ft^2/day, Hdr 10 ft).** `Tv = 1.781 - 0.933*log10(10) = 0.848`;
`t = 0.848 * 100 / 0.1 = 848 days`. **Cross-check (halfway there).** `U = 50%`: `Tv = (pi/4)*0.25 = 0.196`;
`t = 196 days` -- so half the settlement happens in under a quarter of the time to `90%`, the classic decelerating curve. A
non-positive `cv`/`Hdr` or a `U` at/above 100 takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `soil-consolidation-settlement`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, Terzaghi consolidation, `editionNote` naming
the two-branch `Tv(U)`, the `t = Tv*Hdr^2/cv` relation, and the drainage-path convention); `test/fixtures/worked-examples.json`
(the 90% example + the 50% cross-check); `test/fixtures/compute-map.js` (`consolidation-time-rate` ->
`computeConsolidationTimeRate` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `soil-consolidation-settlement`
/ `soil-settlement-elastic` / `soil-bearing-capacity` / `spt-bearing-capacity`); `data/search/aliases.json`
("consolidation time", "time rate of consolidation", "terzaghi consolidation", "degree of consolidation time", "cv
consolidation", "time factor Tv", "preload surcharge time", "settlement time clay", "consolidation rate"); the id appended
to the existing geotech renderers block in `app.js`; the `// dims:` annotation (U dimensionless, cv area/time, Hdr length,
t time); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two-branch switch,
and the non-positive / out-of-range / non-finite error seams. No new module; re-pin `calc-geotech.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the branch switch, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Tv / time output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (U 90%, cv 0.1, Hdr 10 -> 848 days).

## 5. Roadmap position

Opens the geotechnical settlement/foundation trio: it times the settlement `soil-consolidation-settlement` sizes, while
`spt-bearing-capacity` (v415) and `liquefaction-screening` (v416) address the shallow foundation and its seismic hazard. A
consolidation-percent-at-a-given-time inverse and a secondary-compression (creep) tile are the deliberate next follow-ons.
