# roughlogic.com Specification v843 -- Concrete Washout Containment Volume (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v842.md. Concrete-operations / SWPPP sweep, beside
> the concrete take-off tiles.
>
> **The gap, and the evidence for it.** Nothing sizes a **concrete washout** -- the lined pit or container that catches
> chute and pump rinse so high-pH slurry never reaches the ground or a storm drain, which the construction general permit
> requires. Grep confirmed no washout tile. The number this settles: 20 ready-mix trucks at 50 gallons of washout each is
> **1,000 gallons**, which with 15% freeboard is **154 cf** (5.7 cy) -- a roughly **9 ft** square pit at 2 ft deep, sized
> before the first truck washes out on the ground.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`ready-mix-concrete-order`, `concrete`): the truck count is dimensionless, the per-truck washout and
gallon and cubic-foot volumes are `L^3`, the freeboard is dimensionless, the pit depth is `L`, and the pit side is `L`.
The v18/v21 contract: a non-finite or non-positive truck count, per-truck washout, or pit depth returns `{ error }`; a
negative freeboard returns `{ error }`. Citation discipline (v19/v22): the containment identity by name (required volume =
trucks x per-truck washout / 7.48 x (1 + freeboard); pit side = sqrt(volume / depth)), `GOVERNANCE.general`; the note
states that washout captures chute and pump rinse plus returned slurry and must be contained per the SWPPP / CGP (no
discharge to ground or storm), that the slurry is caustic (high pH), that the container is cleaned out at about
three-quarters full and disposed per the plan, and that the per-truck figure is a planning estimate the crew tunes.

## 2. The tile

### 2.1 `concrete-washout-volume` -- Concrete Washout Containment Volume

```
inputs:
  trucks                 ready-mix trucks (or pump washes) (count)
  washout_gal_per_truck  washout volume per truck (gal, default 50)
  freeboard_pct          freeboard allowance (percent, default 15)
  pit_depth_ft           usable pit depth (ft, default 2)

total_gal   = trucks * washout_gal_per_truck
required_cf  = total_gal / 7.48052 * (1 + freeboard_pct/100)
required_cy  = required_cf / 27
pit_side_ft  = sqrt(required_cf / pit_depth_ft)
```

**Pinned worked example.** Trucks 20, washout 50 gal/truck, freeboard 15%, depth 2 ft:
`total = 20 * 50 = 1,000 gal`; `required = 1000 / 7.48052 * 1.15 = ` **153.7 cf** (5.69 cy);
`pit side = sqrt(153.7 / 2) = ` **8.77 ft**. Cross-check: a bigger 40-truck pour doubles it to
`2000/7.48052*1.15 = ` **307.4 cf** (11.4 cy) and a **12.4 ft** square pit -- the container has to be built for the whole
day's washouts, not one truck.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`ready-mix-concrete-order`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (required volume = trucks x washout / 7.48 x (1 + freeboard), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-pour cross-check); `test/fixtures/compute-map.js`
(`concrete-washout-volume` -> `computeConcreteWashoutVolume`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `ready-mix-concrete-order` / `concrete-pour-rate` / `sediment-basin-volume`);
`data/search/aliases.json` (5 collision-checked aliases: "concrete washout volume", "washout pit sizing", "concrete
washout containment", "ready mix washout", "swppp washout"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map
mirroring the `ready-mix-concrete-order` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the gallons, required volumes, pit side, and the
error seams (non-positive trucks, washout, depth; negative freeboard). The calc-construction.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,291 -> 1,292.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20*50/7.48052*1.15 -> 153.7 cf, 5.69 cy).

## 5. Roadmap position

Concrete-operations / SWPPP tile linking the concrete crew to the erosion-control set (`sediment-basin-volume`,
`concrete-washout-volume`), serving the concrete superintendent (concrete / construction). Stays evidence-driven; the CGP
governs containment.
