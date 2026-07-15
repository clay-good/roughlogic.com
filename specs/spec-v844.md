# roughlogic.com Specification v844 -- Haul-Road Total Resistance and Required Rimpull (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v843.md. Equipment / site-logistics sweep, beside
> `haul-cycle-production`.
>
> **The gap, and the evidence for it.** The catalog times the haul cycle but nothing gives the **resistance** a loaded
> hauler fights -- grade plus rolling resistance -- or the rimpull it takes to climb it, the number that picks the gear and
> whether the machine can even make the grade. Grep confirmed no rimpull / haul-road-resistance tile. The number this
> settles: a 150,000 lb hauler on a 5% grade over a 4% rolling-resistance road fights **9%** total resistance and needs
> **13,500 lb** of rimpull (180 lb/ton) -- and grading the road down to 2% rolling resistance is the cheapest horsepower
> there is.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`haul-cycle-production`, `drawbar-pull`): the gross vehicle weight and rimpull carry force `M L T^-2`,
the grade, rolling resistance, and total resistance are dimensionless (percent), and the rimpull-per-ton is a
force-per-mass coefficient. The v18/v21 contract: a non-finite or non-positive gross weight returns `{ error }`; a
non-finite grade or rolling resistance returns `{ error }` (a negative, downhill grade is allowed and can drive the
resistance negative). Citation discipline (v19/v22): the resistance identity by name (total resistance = grade + rolling
resistance; rimpull = total resistance x GVW; 20 lb/ton per 1%), `GOVERNANCE.general`; the note states that rolling
resistance depends on the road surface (about 2% for a hard maintained haul road, 10% or more for soft or rutted ground),
that a downhill grade subtracts and can call for the retarder rather than rimpull, that the required rimpull is compared to
the machine's available rimpull in gear from the manufacturer's rimpull-speed curve, and that road maintenance is the
cheapest way to cut it.

## 2. The tile

### 2.1 `haul-road-resistance` -- Haul-Road Total Resistance and Required Rimpull

```
inputs:
  gvw_lb                  gross vehicle weight, loaded (lb)
  grade_pct               road grade (percent; negative downhill)
  rolling_resistance_pct  rolling resistance (percent, default 4)

total_resistance_pct = grade_pct + rolling_resistance_pct
required_rimpull_lb  = total_resistance_pct / 100 * gvw_lb
rimpull_per_ton_lb   = 20 * total_resistance_pct
```

**Pinned worked example.** GVW 150,000 lb, grade +5%, rolling resistance 4%:
`total = 5 + 4 = ` **9%**; `rimpull = 0.09 * 150000 = ` **13,500 lb** (`20 * 9 = ` **180 lb/ton**, x 75 tons = 13,500).
Cross-check: the same hauler running downhill at -5% grade has `total = -5 + 4 = ` **-1%** and `-1,500 lb` of rimpull --
gravity assists, and the operator is on the retarder, not the throttle.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "trucking"]`, inside the `// Group E` earthwork block near
`haul-cycle-production`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (total resistance = grade + rolling; rimpull = total x GVW, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the downhill cross-check); `test/fixtures/compute-map.js`
(`haul-road-resistance` -> `computeHaulRoadResistance`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `haul-cycle-production` / `drawbar-pull` / `dozer-production`); `data/search/aliases.json` (5 collision-checked
aliases: "haul road resistance", "required rimpull", "grade plus rolling resistance", "total resistance hauler", "rimpull
per ton"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction`
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the total resistance, required rimpull (including the negative downhill case), the
per-ton rimpull, and the error seams (non-positive GVW; non-finite grade or rolling resistance). The calc-earthwork.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,292 -> 1,293.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.09 * 150000 -> 13,500 lb rimpull).

## 5. Roadmap position

Equipment / site-logistics tile beside `haul-cycle-production`: the resistance side that sets the gear and confirms the
grade is climbable, serving the hauler operator and estimator (construction / trucking). Stays evidence-driven; the
manufacturer's rimpull curve governs.
