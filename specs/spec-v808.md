# roughlogic.com Specification v808 -- Tire Contact Patch from Load and Pressure (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v807.md. Explore sweep #25 (entry 5), beside the
> existing `tire-gearing` tile.
>
> **The gap, and the evidence for it.** No tile gives the tire **contact patch** -- the footprint that governs flotation
> (off-road airing down) and soil compaction (agriculture). Grep confirmed no contact-patch / footprint tire tile; the
> existing tire tiles are gearing (`tire-gearing`) and load-rating (`tire-load-check`). The number this settles: a 900 lb
> corner at 35 psi rides on about **25.7 in^2**, and airing down to 15 psi grows it to **60 in^2** at the same load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
mechanic siblings (`tire-gearing`, `valve-flow-coefficient`): the corner load carries `M L T^-2` (force), the inflation
pressure `M L^-1 T^-2`, and both patch areas `L^2`. The v18/v21 contract: a non-finite or non-positive corner load or
inflation pressure returns `{ error }`. Citation discipline (v19/v22): the first-order contact-patch relation A = W / p
by name (ideal air-pressure membrane), `GOVERNANCE.general`; the note states that the average ground pressure roughly
equals the inflation pressure independent of load (the airing-down lever), and that the result is an idealization -- the
sidewall and tread carry a portion of the load, so the real patch is somewhat smaller than W/p.

## 2. The tile

### 2.1 `tire-contact-patch` -- Tire Contact Patch from Load and Pressure

```
inputs:
  corner_load_lb           corner load W (lb)
  inflation_pressure_psi   inflation pressure p (psi)

contact_area_in2 = W / p
contact_area_cm2 = 6.4516 * contact_area_in2
```

**Pinned worked example.** W 900 lb, p 35 psi: `A = 900 / 35 = ` **25.7 in^2** (166 cm^2). Cross-check: airing down to
15 psi at the same 900 lb grows the patch to **60 in^2** (2.3x) -- the flotation the low pressure buys -- while the
average ground pressure tracks the inflation pressure.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic", "agriculture"]`, inside the `// Group K: Mechanic` block beside
`tire-gearing`) -- the Group K citations-audit count moves 12 -> 13; a `tile-meta.js` `_TILES` entry (`K`); a
`citations.js` entry (A = W / p, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example plus the
airing-down cross-check); `test/fixtures/compute-map.js` (`tire-contact-patch` -> `computeTireContactPatch`);
`scripts/related-tiles.mjs` (-> `tire-gearing` / `tire-load-check` / `gear-mph-rpm`); `data/search/aliases.json` (5
collision-checked aliases: "tire contact patch", "tire footprint area", "tire ground pressure", "airing down flotation
patch", "load over inflation pressure area"); the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer`
factory (non-exported, so no DOM-sentinel row), and the id added to the calc-mechanic declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning A = W/p, the metric area, the inverse-pressure flotation, and the error seams. The
calc-mechanic.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,256 -> 1,257.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group K audit bump to 13);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(900 / 35 -> 25.7 in^2).

## 5. Roadmap position

Adds the tire footprint beside the gearing and load-rating tire tiles in Group K, serving both the mechanic (flotation)
and agriculture (soil compaction) trades. The catalog is very saturated and the sweep-25 vein is nearly drained; the
next batch needs a fresh Explore sweep. Stays evidence-driven.
