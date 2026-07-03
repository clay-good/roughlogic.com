# roughlogic.com Specification v149 -- Mold Post-Remediation Clearance Sampling Plan (calc-restoration.js, Group D, 1 New Tile)

> **Status: CUT as a duplicate (2026-07-01, the 0.89.0 dupe vet: the live air-sample-volume tile already computes total pump time; will not be built; was PROPOSED 2026-06-23, DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v146..v150.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one mold-remediation tile sizing the post-remediation clearance air
> sampling plan -- how many samples and how long the pump runs -- the complement to the existing
> single-sample volume tile. Adds one tile to **`calc-restoration.js`** (Group D); no new module,
> group, or dependency. Inherits spec.md through spec-v148.md.
>
> **The gap, and the evidence for it.** `air-sample-volume` gives the air volume to draw for one
> spore-trap sample, but not how many samples a clearance needs or the total pump time. S520 clearance
> sampling is structured: a sample in each remediated zone, an outdoor control to establish the
> baseline genera and concentration, and an unaffected indoor reference -- and each sample takes its
> required volume divided by the cassette pump's flow. The technician planning a clearance has to size
> the day around that count and time, yet the catalog gives the per-sample volume and stops there.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
zone, control, and reference sample counts and the total sample count are `dimensionless`; the
per-sample air volume is `L^3` (liters); the pump flow is `L^3/T` (liters/min); the per-sample and
total pump times are `T` (minutes). The v18/v21 contract: any non-finite input, a remediated-zone
count below 1, a negative control or reference count, or a non-positive sample volume or pump flow
returns `{ error }`; the only division is by the guarded-positive pump flow. Citation discipline
(v19/v22): `GOVERNANCE.general` over the S520 clearance sampling structure, by name; `editionNote`
states that **an independent indoor environmental professional designs the protocol and interprets the
results** -- this is a planning screen for sample count and pump time, not a pass/fail and not a
substitute for the assessor.

## 2. The tile

### 2.1 `mold-clearance-sampling-plan` -- Clearance Air Sampling Count and Pump Time

```
inputs:
  remediated_zones   dimensionless  distinct remediated areas to sample (>= 1)
  outdoor_controls   dimensionless  outdoor baseline samples (default 1)
  ambient_indoor     dimensionless  unaffected indoor reference samples (default 1)
  sample_volume_l    L^3            air volume per spore-trap sample (default 75, from air-sample-volume)
  pump_flow_lpm      L^3/T          cassette pump flow (default 15)

total_samples       = remediated_zones + outdoor_controls + ambient_indoor
minutes_per_sample  = sample_volume_l / pump_flow_lpm
total_pump_min      = total_samples x minutes_per_sample
```

**Pinned worked example.** Three remediated zones, one outdoor control, one ambient reference, 75 L
samples at 15 Lpm: `total = 3 + 1 + 1 = 5 samples`; `minutes_per_sample = 75/15 = 5.0 min`;
`total_pump = 5 x 5.0 = 25 min`.
**Cross-check (more zones, proportionally more time).** Six remediated zones, same controls:
`total = 8 samples`; per-sample unchanged at 5.0 min; `total_pump = 40 min`. The IEP designs and
interprets the protocol; this plans the count and time.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the clearance sampling structure, `editionNote` naming
ANSI/IICRC S520 and the IEP-designs-and-interprets caveat, the planning-not-pass/fail scope);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`mold-clearance-sampling-plan` -> `computeMoldClearanceSamplingPlan` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `air-sample-volume` / `spore-io-ratio` / `mold-remediation-level`);
`data/search/aliases.json` ("clearance sampling", "post remediation verification", "air samples",
"spore trap count", "PRV", "mold clearance"); the id appended to the existing `RESTORATION_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams (non-finite, zones < 1,
controls/reference < 0, volume/flow <= 0). Raise the `calc-restoration.js` size cap by ~20 percent if
needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the count and time lines wrap on
a phone); render-no-nan + a11y sweep, output read to the value (3 zones + 1 + 1 / 75 L / 15 Lpm -> 5
samples, 25 min).

## 5. Roadmap position

Sits between the per-sample volume tile and the clearance interpretation (v150), completing the
mold-verification planning. Further Group D growth stays evidence-driven.
