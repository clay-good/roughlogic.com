# roughlogic.com Specification v905 -- Rebar Chair / Bar-Support Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v904.md. Rebar sweep, beside `rebar-weight-takeoff`
> and `rebar-tie-wire`.
>
> **The gap, and the evidence for it.** The catalog weighs bars and counts ties but nothing counts the **chairs** that hold
> the steel at the design cover. Grep confirmed no rebar-chair tile. The number this settles: a 1,000 sf mat on a 4 ft
> support grid is **66 chairs** with waste -- the bar supports that keep the mesh off the ground and at the right cover, the
> accessory an inspector fails a pour for missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E rebar
siblings (`rebar-weight-takeoff`, `rebar-tie-wire`): the slab area carries `L^2`, the support spacing `L`, the waste is
dimensionless, and the chair count is dimensionless. The v18/v21 contract: a non-finite or non-positive slab area or
support spacing returns `{ error }`; a negative waste returns `{ error }`. Citation discipline (v19/v22): the chair-count
identity by name (chairs = ceil(slab area / support spacing^2 x (1 + waste))), `GOVERNANCE.general`; the note states that
bar supports (chairs and bolsters) hold the rebar or mesh at the specified cover, that the support spacing (about 3 to 4
ft each way, tighter under heavy bars to stop sag) comes from the spec and CRSI practice, and that this is distinct from
the ties (`rebar-tie-wire`) and the bars (`rebar-weight-takeoff`).

## 2. The tile

### 2.1 `rebar-chair-count` -- Rebar Chair / Bar-Support Count

```
inputs:
  slab_area_sf       slab / mat area (ft^2)
  support_spacing_ft chair spacing each way (ft, default 4)
  waste_pct          waste allowance (percent, default 5)

chairs = ceil(slab_area_sf / support_spacing_ft^2 * (1 + waste_pct/100))
```

**Pinned worked example.** Slab 1,000 sf, 4 ft support grid, 5% waste:
`chairs = ceil(1000/4^2*1.05) = ceil(65.6) = ` **66** (63 neat). Cross-check: a tighter 3 ft grid under heavier bars is
`ceil(1000/9*1.05) = ceil(116.7) = ` **117 chairs** -- the spacing enters squared, so a foot tighter nearly doubles the
count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`rebar-tie-wire`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (chairs = ceil(area / spacing^2 x (1 + waste)), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the tighter-grid cross-check); `test/fixtures/compute-map.js`
(`rebar-chair-count` -> `computeRebarChairCount`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `rebar-tie-wire` / `rebar-weight-takeoff` / `welded-wire-mesh`); `data/search/aliases.json` (5 collision-checked
aliases: "rebar chair count", "bar support count", "rebar bolster count", "rebar chairs quantity", "rebar support
spacing"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `rebar-tie-wire` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the chair count and the error seams (non-positive area or spacing; negative waste).
The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,353 -> 1,354.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(1000/16*1.05) -> 66 chairs).

## 5. Roadmap position

Rebar accessory takeoff beside `rebar-tie-wire` (ties) and `rebar-weight-takeoff` (bars), serving the rodbuster (concrete
/ construction). Stays evidence-driven; the spec and CRSI set the support spacing.
