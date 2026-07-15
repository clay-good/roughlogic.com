# roughlogic.com Specification v803 -- Live Load Reduction (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v802.md. Fresh Explore sweep #24
> (entry 3), joining the ASCE 7 load family (`wind-cc-pressure`, `snow-drift-load`, `asce7-load-combinations`).
>
> **The gap, and the evidence for it.** The catalog computes ASCE 7 wind, snow, seismic, and load combinations, but not
> the **live load reduction** that a large tributary area earns -- the routine §4.7 reduction every column and girder
> takedown uses. Grep confirmed no tile computes it (`live.load.reduc|kll` = 0). The number this settles: a 50 psf office
> load on an interior column (KLL 4) with 400 ft² tributary reduces 37.5% to **31.25 psf**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
ASCE 7 siblings (`wind-cc-pressure`, `snow-drift-load`): the unreduced and reduced loads carry `M L^-1 T^-2` (psf), the
tributary area `L^2`, the member type and floors-supported are dimensionless, and KLL·AT carries `L^2`. The v18/v21
contract: a non-finite input (via `_finiteGuard`), an unknown member type, an invalid floors-supported value, or a
non-positive load or area returns `{ error }`. Citation discipline (v19/v22): the ASCE 7 §4.7 reduction equation and the
Table 4.7-1 KLL factors by name, `GOVERNANCE.general` matching the siblings; the note states the 400 ft² applicability
gate, the 0.50/0.40 L0 floors by floors-supported, and that loads over 100 psf, garages, and assembly occupancies are
generally not reducible.

## 2. The tile

### 2.1 `asce-live-load-reduction` -- Live Load Reduction (ASCE 7 Ch. 4)

```
inputs:
  unreduced_load_psf   unreduced (tabulated) live load L0 (psf)
  tributary_area_ft2   tributary area AT (ft^2)
  member_type          KLL from Table 4.7-1: interior/exterior column (4),
                       edge column w/ cantilever slab (3), corner column w/
                       cantilever slab / edge & interior beam (2), other (1)
  floors_supported     one (floor 0.50 L0) | two_plus (floor 0.40 L0)

KLL x AT >= 400 ft^2 ?  L = L0 (0.25 + 15/sqrt(KLL x AT)), floored at 0.50/0.40 L0
otherwise               L = L0  (no reduction)
```

**Pinned worked example.** L0 50 psf, interior column (KLL 4), AT 400 ft², one floor: `KLL·AT = 1600 >= 400`;
`L = 50 (0.25 + 15/sqrt(1600)) = 50 x 0.625 = ` **31.25 psf** (37.5% reduction), above the 0.50·50 = 25 psf floor.
Cross-check: the same column with 1,000 ft² tributary computes 24.36 psf but is held at the 0.50 L0 floor of
**25 psf**; a KLL-2 beam on 150 ft² (KLL·AT = 300 < 400) gets no reduction.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`) beside `wind-cc-pressure`; a `tile-meta.js` `_TILES` entry
(`E`); a `citations.js` entry (ASCE 7 §4.7 / Table 4.7-1, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the floor-governed cross-check); `test/fixtures/compute-map.js`
(`asce-live-load-reduction` -> `computeAsceLiveLoadReduction`); `scripts/related-tiles.mjs` (->
`asce7-load-combinations` / `snow-drift-load` / `wind-cc-pressure`); `data/search/aliases.json` (5 collision-checked
aliases: "live load reduction", "asce 7 live load reduction", "reduced live load", "tributary area load reduction",
"kll live load element factor"); the calc-construction `CONSTRUCTION_RENDERERS` map entry via the `_simpleRenderer`
factory (non-exported, so no DOM-sentinel row) with member-type and floors-supported selects, and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the reduction, the two floors, the
400 ft² gate, and the error seams. The calc-construction.js and Group E group-shell gzip caps are watched at build.
Lazy-loaded, absent from home first paint. Home tile count 1,251 -> 1,252.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (50 psf / KLL 4 / 400 ft² -> 31.25 psf).

## 5. Roadmap position

Fills the live-load side of the ASCE 7 load family in Group E, beside the wind, snow, seismic, and load-combination
tiles. The catalog remains very saturated; the sweep-24 queue continues. Stays evidence-driven.
