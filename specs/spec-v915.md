# roughlogic.com Specification v915 -- Hydronic Outdoor Reset Ratio and Supply Target (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v914.md. Hydronic-controls sweep, beside the
> accepted `hydronic-buffer-tank` and `boiler-pipe-sizing` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes hydronic pipe, flow, buffer tanks, and radiant loops but
> nothing sets the **outdoor-reset curve** every boiler control asks for. Grep confirmed no reset tile. Outdoor reset is
> the single biggest comfort-and-fuel lever on a hydronic system. The number this settles: a 180 F design supply
> resetting to an 80 F minimum over a 0 F to 65 F outdoor span is a **1.54 reset ratio**, targeting about **134 F** at 30
> F outdoors.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the sibling
hydronic tiles: this module annotates inputs with the `{ args: dimensionless }` shortcut and carries temperatures as `T`,
so the reset ratio is dimensionless and the supply target is `T`. The v18/v21 contract: a design supply at or below the
minimum supply, or a no-heat outdoor temperature at or below the design outdoor temperature, returns `{ error }`.
Citation discipline (v19/v22): the outdoor-reset curve by name (ratio = (design supply - min supply) / (no-heat OA -
design OA); target = min supply + ratio x (no-heat OA - current OA), clamped to the min/design supply),
`GOVERNANCE.general`; the note states that reset lowers the supply as it warms to save fuel and improve comfort, that the
curve is clamped flat at the design supply below the design OA and at the min supply above the no-heat OA, that fin-tube
runs a steep ratio while radiant runs a shallow one off a low design supply, and that a non-condensing boiler must still
protect its return above the flue-condensation limit -- the control manual and the building heat loss govern the curve.

## 2. The tile

### 2.1 `outdoor-reset-ratio` -- Hydronic Outdoor Reset Ratio and Supply Target

```
inputs:
  supply_design_f  design supply temp at the design OA (F)
  supply_min_f     minimum supply temp at the no-heat OA (F)
  oa_design_f      design (coldest) outdoor temp (F)
  oa_noheat_f      no-heat (warmest heating) outdoor temp (F)
  oa_current_f     outdoor temp to evaluate (F)

reset_ratio     = (supply_design_f - supply_min_f) / (oa_noheat_f - oa_design_f)
raw_target      = supply_min_f + reset_ratio x (oa_noheat_f - oa_current_f)
supply_target_f = clamp(raw_target, supply_min_f, supply_design_f)
```

**Pinned worked example.** 180 F design supply at 0 F, 80 F min at 65 F, evaluated at 30 F:
`ratio = (180 - 80)/(65 - 0) = ` **1.54**; `target = 80 + 1.54 x (65 - 30) = ` **133.8 F**. Cross-check: at 70 F outdoors
(above the 65 F no-heat point) the raw target `80 + 1.54 x (65 - 70) = ` 72.3 F falls below the minimum, so it **clamps
to 80 F** -- the heat is effectively off; and at the 0 F design outdoor the target is exactly the 180 F design supply.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `hydronic-buffer-tank`); a `tile-meta.js` `_TILES` entry
(`C`); a `citations.js` entry (outdoor-reset curve, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
pinned example plus the clamp cross-check, pinning the ratio and supply target); `test/fixtures/compute-map.js`
(`outdoor-reset-ratio` -> `computeOutdoorResetRatio`, module `../../calc-hvacsystems.js`); `scripts/related-tiles.mjs`
(-> `boiler-pipe-sizing` / `radiant-floor-output` / `hydronic-gpm-deltat`); `data/search/aliases.json` (5
collision-checked aliases: "outdoor reset ratio", "outdoor reset curve", "boiler reset", "reset ratio", "supply water
temperature reset"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `HVACSYSTEMS_RENDERERS`
map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-hvacsystems declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the ratio, the supply target, the clamp flag (both directions), the design-OA
identity, and the error seams (min >= design supply, no-heat <= design OA, non-finite). The calc-hvacsystems.js gzip cap
is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent
from home first paint. Home tile count 1,363 -> 1,364.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((180 - 80)/(65 - 0) -> 1.54 ratio; ~134 F at 30 F outdoors).

## 5. Roadmap position

Hydronic-controls tile beside `hydronic-buffer-tank`, serving the hydronic install / service tech (hvac). Deliberately a
control-curve aid; the control manual, the boiler's return-protection limit, and the building heat loss govern. Stays
evidence-driven. Continues the hydronic-controls sweep at 1 new spec (v915).
