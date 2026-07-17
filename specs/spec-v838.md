# roughlogic.com Specification v838 -- Cold-Planing (Milling) Production and RAP Tonnage (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v837.md. Paving sweep (entry 4), beside
> `asphalt-paving-speed` and `asphalt-spread-rate`.
>
> **The gap, and the evidence for it.** Nothing gives **milling** production -- the square yards per hour a cold planer
> cuts and the reclaimed-asphalt (RAP) tonnage it generates, which sizes the haul fleet to keep the mill moving. Grep
> confirmed no milling / cold-planing tile. The number this settles: a 7 ft drum at 30 ft/min covers **980 sy/hr**, and a
> 4 in cut of 148 pcf pavement is about **218 tph** of RAP -- roughly a truck every three minutes, or the mill stops.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E paving
siblings (`asphalt-paving-speed`, `asphalt-spread-rate`): the drum width and cut depth carry `L`, the speed `L T^-1`, the
density `M L^-3`, the efficiency is dimensionless, the area rate is `L^2 T^-1`, the spread is `M L^-2`, and the RAP rate is
`M T^-1`. The v18/v21 contract: a non-finite or non-positive drum width, speed, depth, density, or efficiency returns
`{ error }`. Citation discipline (v19/v22): the milling production identity by name (sy/hr = width x speed x 60 x
efficiency / 9; RAP tph = sy/hr x depth x density x 0.75 / 2000), `GOVERNANCE.general`; the note states that milling
efficiency runs lower than paving (frequent truck changes and repositioning), that the RAP density is that of the existing
pavement, and that the RAP tonnage sizes the haul fleet that keeps the mill cutting.

## 2. The tile

### 2.1 `pavement-milling-production` -- Cold-Planing (Milling) Production and RAP Tonnage

```
inputs:
  drum_width_ft  cutting drum width (ft, default 7)
  speed_fpm      milling forward speed (ft/min)
  depth_in       cut depth (in)
  density_pcf    existing pavement density (pcf, default 148)
  efficiency     job efficiency (dimensionless, default 0.7)

sy_per_hr        = drum_width_ft * speed_fpm * 60 * efficiency / 9
spread_lb_per_sy = depth_in * density_pcf * 0.75
rap_tph          = sy_per_hr * spread_lb_per_sy / 2000
```

**Pinned worked example.** Drum 7 ft, speed 30 ft/min, depth 4 in, density 148 pcf, efficiency 0.7:
`sy/hr = 7*30*60*0.7/9 = ` **980 sy/hr**; `spread = 4*148*0.75 = 444 lb/sy`; `RAP = 980*444/2000 = ` **217.6 tph**.
Cross-check: speeding to 45 ft/min lifts it to `7*45*60*0.7/9 = ` **1,470 sy/hr** and `1470*444/2000 = ` **326 tph** of
RAP -- more speed needs more trucks, or the mill outruns its haul and stops.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`asphalt-paving-speed`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (sy/hr = width x speed x 60 x E / 9; RAP tph = sy/hr x spread / 2000, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the faster-speed cross-check); `test/fixtures/compute-map.js`
(`pavement-milling-production` -> `computePavementMillingProduction`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `asphalt-paving-speed` / `asphalt-spread-rate` / `haul-cycle-production`);
`data/search/aliases.json` (5 collision-checked aliases: "milling production", "cold planing production", "pavement
milling rate", "rap tonnage", "milling sy per hour"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map
mirroring the `asphalt-paving-speed` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the area rate, spread, RAP tph, and the error seams
(non-positive width, speed, depth, density, efficiency). The calc-construction.js gzip cap is watched at build. Verify at
build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile
count 1,286 -> 1,287.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(7*30*60*0.7/9 -> 980 sy/hr, 218 tph RAP).

## 5. Roadmap position

Fourth paving tile: the milling side that precedes the overlay, sizing the RAP haul fleet, serving the milling crew and
estimator (construction / carpentry). Stays evidence-driven; field conditions govern the efficiency.
