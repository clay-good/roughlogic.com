# roughlogic.com Specification v428 -- Stormwater Detention Volume (Modified Rational) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.148.0; proposed 2026-07-03). Third and final tile of the drainage-hydraulics trio (v426 overflow scupper ->
> v427 sewage force-main velocity -> v428 stormwater detention volume). `stormwater-rational` gives the peak runoff rate off
> a site; this tile sizes the detention basin that holds the difference between that developed runoff and the allowable
> release, the storage a site-development permit requires.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When development increases runoff, a detention basin
> stores the excess and releases it at the pre-development rate. The modified rational method sizes it: the developed inflow
> is `Q_in = C * i * A` (cfs), and for a storm of duration `td` the required storage is
> `V = (Q_in - Q_allow) * td * 60` (cubic feet), maximized over the critical duration. `stormwater-rational` gives the peak
> rate only, not the storage volume. This adds the detention tile to the existing **`calc-plumbing.js`** module (Group B);
> no new group, trade, or dependency. Inherits spec.md through spec-v427.md.
>
> **The gap, and the evidence for it.** A `2 acre` site at runoff coefficient `C = 0.85` under a `3 in/hr` design storm
> generates `Q_in = 0.85 * 3 * 2 = 5.10 cfs` (the rational method's `1 cfs per acre-inch/hr`). If the allowable release is
> the `1.0 cfs` pre-development rate, then over a `30 min` storm the required storage is
> `V = (5.10 - 1.0) * 30 * 60 = 7,380 ft^3 = 0.169 acre-ft`. No tile does this; `stormwater-rational` sized the pipe for the
> peak but not the pond that holds the water back.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The runoff coefficient is
dimensionless; the rainfall intensity is a length per time (in/hr); the area is an area (acres); the flows are volumetric
flows (cfs); the duration is a time (min); the storage is a volume (ft^3, also reported in acre-ft). The v18/v21 contract:
any non-finite input, or a non-positive intensity, area, or duration, or an allowable release at or above the inflow (no
detention needed), returns `{ error }`; the tile computes the developed inflow and the required storage for the given
duration, and notes that the critical (governing) duration is found by maximizing storage over duration. Citation discipline
(v19/v22): `GOVERNANCE.general` over the modified rational detention method by name; `editionNote` names **the rational
inflow `Q_in = C*i*A` (cfs, the `1 cfs per acre-inch/hr` identity), the modified-rational required storage
`V = (Q_in - Q_allow) * td * 60` (ft^3) maximized over the critical duration, and the `43,560 ft^2 per acre` conversion**,
and states that **this returns the detention storage for a design storm duration, that the governing storage is the maximum
over duration (try several `td`), that the rational method suits small sites (under about 200 acres), and that it is a
planning aid, not a substitute for a stamped stormwater design or local criteria**.

## 2. The tile

### 2.1 `stormwater-detention-volume` -- Stormwater Detention Volume (Modified Rational)

```
inputs:
  runoff_c        -       developed runoff coefficient C
  intensity_in_hr in/hr   design rainfall intensity
  area_ac         acres   drainage area
  q_allow_cfs     cfs     allowable (pre-development) release rate
  duration_min    min     storm duration

q_in_cfs   = runoff_c * intensity_in_hr * area_ac
storage_cf = (q_in_cfs - q_allow_cfs) * duration_min * 60
storage_ac_ft = storage_cf / 43560
```

**Pinned worked example (C 0.85, i 3 in/hr, 2 ac, Q_allow 1.0 cfs, 30 min).** `Q_in = 0.85*3*2 = 5.10 cfs`;
`V = (5.10 - 1.0)*30*60 = 7,380 ft^3 = 0.169 acre-ft`. **Cross-check (a longer, lighter storm).** At `i = 2 in/hr` over
`60 min`, `Q_in = 3.40 cfs` and `V = (3.40 - 1.0)*60*60 = 8,640 ft^3` -- larger storage, which is why the critical duration
must be searched. An allowable release at/above the inflow, or a non-positive input, takes the error path; the non-finite
seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `stormwater-rational`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the modified rational detention method, `editionNote` naming the inflow and
storage relations, the critical-duration note, and the acre-ft conversion); `test/fixtures/worked-examples.json` (the 30 min
example + the 60 min cross-check); `test/fixtures/compute-map.js` (`stormwater-detention-volume` ->
`computeStormwaterDetentionVolume` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `stormwater-rational` /
`time-of-concentration` / `overflow-scupper-sizing` / `roof-drain-sizing`); `data/search/aliases.json` ("stormwater
detention", "detention volume", "modified rational", "detention basin sizing", "stormwater storage", "detention pond",
"runoff storage", "detention calculation", "pre post development runoff"); the id appended to the existing plumbing
renderers block in `app.js`; the `// dims:` annotation (C dimensionless, intensity length/time, area area, flows volumetric
flow, duration time, storage volume); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the release-vs-inflow guard, and the non-positive / non-finite error seams. No new module; re-pin
`calc-plumbing.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the release guard, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the inflow / storage output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (C 0.85, i 3, 2 ac -> 5.10 cfs, 7,380 ft^3).

## 5. Roadmap position

Closes the drainage-hydraulics trio: v426 the overflow, v427 the force main, and v428 the detention pond. A critical-
duration search that reports the governing storage across a range of durations, and an outlet-orifice-sizing companion for
the allowable release, are the deliberate next follow-ons.
