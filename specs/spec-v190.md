# roughlogic.com Specification v190 -- Bound Water in Wet Materials: Pounds and Gallons to Evaporate (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v188..v196 (water-damage restoration).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile estimating the weight and volume of water
> held in affected materials that drying must evaporate, from the material volume, dry density, and the
> moisture-content drop to the dry goal. Adds one tile to **`calc-restoration.js`** (Group D); no new
> module, group, or dependency. Inherits spec.md through spec-v187.md.
>
> **The gap, and the evidence for it.** The catalog measures standing water (`standing-water`),
> estimates the evaporation *rate* (`evaporation-load`), and sets a dry goal (`drying-goal`,
> `moisture-dry-goal`), but never the *quantity* bound in the structure: how many pounds, how many
> gallons, the drying system has to pull out of the wood, drywall, and concrete before the job is dry.
> That total is what scopes equipment-days and validates the plan, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
material volume is `L^3` (ft^3), the dry density is `M L^-3` (lb/ft^3), moisture contents are percent
of dry weight (`dimensionless`), the water weight is `M` (lb), and the volume is `L^3` (gal via the
8.34 lb/gal constant). The v18/v21 contract: any non-finite input, a non-positive volume or density,
or a target moisture content above the current returns `{ error }`; the only division is by the fixed
8.34 lb/gal. Citation discipline (v19/v22): `GOVERNANCE.general` over the gravimetric water-mass
relation, by name; `editionNote` names ANSI/IICRC S500 and states that moisture content here is on a
dry-weight basis (consistent with `wood-emc`), that dry density and material moisture vary by species
and product, and that in-situ meter readings and the restorer's judgment govern -- this is a planning
estimate, not a gravimetric measurement.

## 2. The tile

### 2.1 `bound-water` -- Water Mass and Volume to Evaporate From Wet Materials

```
inputs:
  material_volume_ft3   L^3       volume of affected material (area x thickness)
  dry_density_lb_ft3    M L^-3    oven-dry density of the material (e.g. softwood ~32, gypsum ~40)
  mc_current_pct        %         current moisture content (dry-weight basis)
  mc_goal_pct           %         dry-standard / goal moisture content

dry_mass_lb   = material_volume_ft3 x dry_density_lb_ft3
water_lb      = dry_mass_lb x (mc_current_pct - mc_goal_pct) / 100
water_gal     = water_lb / 8.34
```

**Pinned worked example.** 10 ft^3 of softwood framing at a 32 lb/ft^3 dry density, currently at 40%
moisture content, drying to a 12% goal: `dry_mass = 10 x 32 = 320 lb`;
`water = 320 x (40 - 12)/100 = 320 x 0.28 = 89.6 lb`; `water_gal = 89.6 / 8.34 = 10.7 gal`. The
drying system must evaporate ~90 lb (10.7 gal) from that framing. **Cross-check (smaller drop).** The
same framing taken only from 40% to a 19% interim reading: `water = 320 x 0.21 = 67.2 lb = 8.1 gal`.
Dry density and moisture content vary by material; meter readings and S500 govern the actual endpoint.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the gravimetric water-mass relation, `editionNote` naming
ANSI/IICRC S500 and the dry-weight-basis and estimate-not-measurement caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`bound-water` -> `computeBoundWater` in `../../calc-restoration.js`); `scripts/related-tiles.mjs`
(-> `evaporation-load` / `drying-goal` / `wood-emc`); `data/search/aliases.json` ("bound water",
"pounds of water", "gallons to evaporate", "water in materials", "moisture mass", "water weight");
the id appended to the existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example,
the smaller-drop cross-check, and error seams (non-finite, volume <= 0, density <= 0, goal >=
current). Raise the `calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the goal>=current seam); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the dry
mass, water pounds, and gallons wrap on a phone); render-no-nan + a11y sweep, output read to the value
(10 ft^3 / 32 / 40->12 -> 89.6 lb / 10.7 gal; 40->19 -> 67.2 lb).

## 5. Roadmap position

Quantifies the water the `evaporation-load` and `dehumidifier` tiles must remove against the
`drying-goal`. Further Group D growth stays evidence-driven.
