# roughlogic.com Specification v718 -- Max Sprinkler Design Area for a Water Supply (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-firesprinkler.js`** (Group
> F), no new module, group, or dependency. Inherits spec.md through spec-v717.md. Sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `sprinkler-system-demand` tile runs NFPA 13 forward: from a
> design area and density it returns the demand and stored volume. The retrofit question is the inverse -- **the largest
> area a given water supply can protect at a density**. From `total = density x area + hose`, the sprinkler flow is
> `supply - hose`, so `max_area = (supply - hose) / density`. The number this settles: a **550-gpm** supply with **250
> gpm** of hose at **0.20 gpm/ft^2** covers up to **1,500 ft^2**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`sprinkler-system-demand` sibling: the supply and hose flows are `L^3 T^-1` (gpm), the density is `L T^-1` (gpm/ft^2), and
the returned area is `L^2` (ft^2). The v18/v21 contract: any non-finite input, a non-positive supply or density, a
negative hose allowance, or a hose allowance that meets or exceeds the supply (no flow left for sprinklers) returns
`{ error }`. Citation discipline (v19/v22): the NFPA 13 area/density demand solved for the area, `GOVERNANCE.general`
matching the sibling; the note states that **a lower density (a lighter hazard) or a smaller hose allowance lets the same
supply cover more area, this is the area/density (pipe-schedule-style) screen and a most-remote-area hydraulic
calculation at the supply's flowing pressure governs, and a fire-protection engineer and the AHJ govern**.

## 2. The tile

### 2.1 `sprinkler-protection-area-for-supply` -- Max Sprinkler Design Area for a Water Supply (NFPA 13)

```
inputs:
  available_supply_gpm   L^3 T^-1   available water supply (> 0)
  density                L T^-1     design density gpm/ft^2 (> 0, default 0.20)
  hose_gpm               L^3 T^-1   hose-stream allowance (>= 0, default 250; must be < supply)

sprinkler_gpm = available_supply_gpm - hose_gpm
max_design_area_ft2 = sprinkler_gpm / density
```

**Pinned worked example.** supply = 550 gpm, density = 0.20, hose = 250 gpm: `sprinkler_gpm = 300`,
`max_area = 300 / 0.20 = ` **1,500 ft^2**; feeding a 1,500 ft^2 design area back through `sprinkler-system-demand` at the
same density and hose returns a 550-gpm total demand, the input. A lighter 0.10 gpm/ft^2 hazard doubles the coverable area
to 3,000 ft^2.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`) placed beside `sprinkler-system-demand` in the later spec-vNN
section, well past the Group F exact-35 audit block (the original Fire-Ground block); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (area/density demand solved for the area, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`sprinkler-protection-area-for-supply` -> `computeSprinklerProtectionAreaForSupply`); `scripts/related-tiles.mjs`
(-> `sprinkler-system-demand` / `fire-pump-curve` / `sprinkler-density` / `sprinkler-head-layout`);
`data/search/aliases.json` (5 collision-checked question aliases: "max sprinkler area for my water supply", "how much area
can my fire pump protect", ...); the calc-firesprinkler `FIRESPRINKLER_RENDERERS` map entry via the shared `_simpleRenderer`
factory (three number fields) and the id added to the calc-firesprinkler declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the round-trip through `computeSprinklerSystemDemand` across a supply/density/hose sweep, the
lighter-hazard-more-area monotonicity, and the error seams (including the hose-exceeds-supply guard). The
calc-firesprinkler.js gzip cap is raised 6000 -> 7000 B (the module was at 93.2%). Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,166 -> 1,167.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1,500 ft^2 for a 550-gpm
supply at 0.20 gpm/ft^2).

## 5. Roadmap position

Pairs the forward demand tile (`sprinkler-system-demand`, demand from an area) with its inverse (area from a supply), the
two halves of the water-supply-vs-coverage question. Further Group F fire-sprinkler growth stays evidence-driven.
