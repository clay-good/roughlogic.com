# roughlogic.com Specification v820 -- Dozer Ripper Loosening Production Rate (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,264 -> 1,265 tiles; spec-v816
> through v819 not yet landed, so the anchored count differs from this spec's assumed 1,268 -> 1,269). Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v819.md. Construction-equipment production sweep
> (entry 5), beside `dozer-production` and `loader-production`.
>
> **The gap, and the evidence for it.** The catalog has no ripping tile. Ripping does not move dirt -- it fractures rock
> and hardpan in place so a dozer or loader can then dig it -- so its production is a loosened-volume rate set by the shank
> spacing, the penetration, and the tractor speed. Grep confirmed no ripper tile. The number this settles: a shank on 3 ft
> centers at 1.5 ft deep, ripping at 132 ft/min (1.5 mph), loosens about **990 bank cy/hr** -- the volume the push spread
> then has to handle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`dozer-production`, `haul-cycle-production`): the shank spacing and penetration carry `L`, the speed
`L T^-1`, the efficiency is dimensionless, the ripped cross-section is `L^2`, and the loosened production is a volume-rate
`L^3 T^-1` (per-hour implicit). The v18/v21 contract: a non-finite or non-positive spacing, penetration, speed, or
efficiency returns `{ error }`. Citation discipline (v19/v22): the swept-prism production identity by name (production =
spacing x penetration x speed x 60 x efficiency / 27), `GOVERNANCE.general`; the note states that ripping only loosens
the material in place (pair it with `dozer-production` to move it), that whether ground is rippable at all comes from a
seismic-velocity judgment the operator makes -- not from this tile -- and that overlapping passes and tooth wear cut the
real number below the swept-prism ideal.

## 2. The tile

### 2.1 `ripper-production` -- Dozer Ripper Loosening Production Rate

```
inputs:
  spacing_ft      shank spacing / pass width (ft)
  penetration_ft  ripping depth (ft)
  speed_fpm       ripping speed (ft/min)
  efficiency      job efficiency (dimensionless, default 0.75)

cross_section_ft2  = spacing_ft * penetration_ft
production_bcy_hr  = cross_section_ft2 * speed_fpm * 60 * efficiency / 27
```

**Pinned worked example.** Spacing 3 ft, penetration 1.5 ft, speed 132 ft/min, efficiency 0.75:
`cross-section = 3 * 1.5 = 4.5 ft^2`; `production = 4.5 * 132 * 60 * 0.75 / 27 = ` **990 bank cy/hr**. Cross-check: easing
to a slower 88 ft/min (1.0 mph) in tougher rock drops it to `4.5 * 88 * 60 * 0.75 / 27 = ` **660 bank cy/hr** -- speed,
which the rock's hardness limits, is the lever, and deeper or wider passes rarely pay when they stall the tractor.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`dozer-production`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (production = spacing x penetration x speed x 60 x efficiency / 27, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the tougher-rock cross-check); `test/fixtures/compute-map.js`
(`ripper-production` -> `computeRipperProduction`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `dozer-production` / `loader-production` / `soil-swell-shrink`); `data/search/aliases.json` (5 collision-checked
aliases: "ripper production", "dozer ripping rate", "rock ripping production", "loosened cy per hour", "ripping shank
production"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction`
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the cross-section, the loosened production, and the error seams (non-positive
spacing, penetration, speed, efficiency). The calc-earthwork.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,268 -> 1,269.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(4.5 * 132 * 60 * 0.75 / 27 -> 990 bcy/hr).

## 5. Roadmap position

Fifth tile in the construction-equipment production vein: the loosening step that feeds the push, load, haul, and compact
production tiles already landed. Serves the earthwork estimator (construction) and grading crew (surveying). Stays
evidence-driven; the operator judges rippability, not the tile.
