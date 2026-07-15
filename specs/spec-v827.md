# roughlogic.com Specification v827 -- Sediment Basin / Trap Storage Volume (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v826.md. Erosion-control sweep (entry 6), beside
> `silt-fence-drainage` and `check-dam-spacing`.
>
> **The gap, and the evidence for it.** The catalog sizes stormwater detention (`stormwater-detention-volume`) but nothing
> sizes a **sediment basin** -- the settling storage a construction general permit requires per disturbed acre, a
> different criterion from flood-control detention. Grep confirmed no sediment-basin / sediment-trap tile. The number this
> settles: a 5-acre disturbance at the common 3,600 cf/acre wet-storage rule needs **18,000 cf** (667 cy), which at a 3 ft
> depth is a **6,000 sf** pond footprint -- the pad the grading crew has to find room for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`stormwater-detention-volume`, `rusle-soil-loss`): the disturbed area carries `L^2` (acres), the
per-acre storage rule is a volume-per-area (`L`), the basin depth is `L`, the required volumes are `L^3`, and the surface
area is `L^2`. The v18/v21 contract: a non-finite or non-positive disturbed area, storage rule, or basin depth returns
`{ error }`. Citation discipline (v19/v22): the storage identity by name (required volume = disturbed acres x per-acre
rule; surface = volume / depth), `GOVERNANCE.general`; the note states that the per-acre storage figure (commonly around
3,600 cf/acre of wet storage, doubled where dry storage is also required) is set by the construction general permit or the
AHJ and is entered here, that this tile sizes settling storage only -- the principal spillway, dewatering device, and
emergency spillway are designed separately -- and that the basin is cleaned out at about half its capacity.

## 2. The tile

### 2.1 `sediment-basin-volume` -- Sediment Basin / Trap Storage Volume

```
inputs:
  disturbed_ac           disturbed drainage area (acres)
  storage_rule_cf_per_ac required storage per acre (cf/acre, default 3600)
  basin_depth_ft         usable settling depth (ft, default 3)

required_cf     = disturbed_ac * storage_rule_cf_per_ac
required_cy     = required_cf / 27
surface_area_sf = required_cf / basin_depth_ft
```

**Pinned worked example.** Disturbed 5 acres, rule 3,600 cf/acre, depth 3 ft:
`required = 5 * 3600 = ` **18,000 cf** (667 cy); `surface = 18000 / 3 = ` **6,000 sf**. Cross-check: a permit requiring
both wet and dry storage (7,200 cf/acre) doubles it to `5 * 7200 = ` **36,000 cf** (1,333 cy) -- the per-acre rule the AHJ
sets is the lever, and a deeper basin trades footprint for excavation.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`check-dam-spacing`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (required volume = disturbed acres x per-acre rule, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wet+dry cross-check); `test/fixtures/compute-map.js`
(`sediment-basin-volume` -> `computeSedimentBasinVolume`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `rusle-soil-loss` / `stormwater-detention-volume` / `silt-fence-drainage`); `data/search/aliases.json` (5
collision-checked aliases: "sediment basin volume", "sediment trap sizing", "settling basin storage", "sediment pond
volume", "construction basin storage"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring
`_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the required volumes, the surface area, and the error seams
(non-positive area, rule, depth). The calc-earthwork.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,275 -> 1,276.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5 * 3600 -> 18,000 cf, 667 cy).

## 5. Roadmap position

Sixth erosion-control tile: the settling-storage sizing that follows `rusle-soil-loss` and sits beside the perimeter and
channel BMPs, serving the erosion-control crew (construction / surveying). Distinct from flood-control
`stormwater-detention-volume`. Stays evidence-driven; the general permit sets the per-acre rule.
