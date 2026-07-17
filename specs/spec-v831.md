# roughlogic.com Specification v831 -- Buried Pipe Flotation and Anti-Flotation Backfill (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v830.md. Underground-utility sweep, beside
> `pipe-bedding-backfill` and the `annular-grout-volume` tile.
>
> **The gap, and the evidence for it.** The catalog beds and backfills pipe (`pipe-bedding-backfill`) but nothing checks
> **flotation** -- an empty large-diameter pipe in a flooded trench is a boat, and it will float up through wet backfill.
> Grep confirmed no flotation / buoyancy pipe tile. The number this settles: a 48-in empty pipe sees **784 lb/ft** of
> uplift, so 200 lb/ft of pipe plus 900 lb/ft of backfill gives only a **1.40** factor of safety, short of 1.5 -- the
> cover has to grow to about **976 lb/ft** of backfill to hold it down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`pipe-bedding-backfill`, `submerged-earth-pressure`): the pipe outside diameter carries `L`, the water
unit weight is a weight-density `M L^-2 T^-2`, the per-foot weights and uplift are force-per-length `M T^-2`, and the
factor of safety is dimensionless. The v18/v21 contract: a non-finite or non-positive pipe diameter, water unit weight, or
target factor of safety returns `{ error }`; a negative pipe or backfill weight returns `{ error }`. Citation discipline
(v19/v22): the Archimedes flotation identity by name (uplift per ft = water unit weight x pi/4 x OD^2; FS = resisting
weight / uplift), `GOVERNANCE.general`; the note states that flotation is critical when the pipe is empty and the trench
is flooded (a high water table or saturated backfill), that submerged backfill counts only its buoyant weight, that
concrete collars or continued backfill are the fixes, and that the design engineer governs.

## 2. The tile

### 2.1 `pipe-flotation` -- Buried Pipe Flotation and Anti-Flotation Backfill

```
inputs:
  pipe_od_in           pipe outside diameter (in)
  pipe_weight_plf      empty pipe weight (lb/ft)
  backfill_weight_plf  resisting backfill weight over the pipe (lb/ft)
  target_fs            target factor of safety (default 1.5)
  water_unit_wt_pcf    water unit weight (pcf, default 62.4)

uplift_plf            = water_unit_wt_pcf * (PI/4) * (pipe_od_in/12)^2
resisting_plf         = pipe_weight_plf + backfill_weight_plf
fs                    = resisting_plf / uplift_plf
required_backfill_plf = target_fs * uplift_plf - pipe_weight_plf
```

**Pinned worked example.** OD 48 in, pipe 200 lb/ft, backfill 900 lb/ft, target FS 1.5:
`uplift = 62.4 * (PI/4) * 4^2 = 62.4 * 12.566 = ` **784.1 lb/ft**; `FS = (200+900) / 784.1 = ` **1.40** (short of 1.5);
`required backfill = 1.5*784.1 - 200 = ` **976.2 lb/ft**. Cross-check: the same pipe empty with no backfill has
`FS = 200 / 784.1 = ` **0.26** -- it floats, which is why an empty pipe is ballasted or held with concrete collars until
the backfill is complete.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "plumbing"]`, inside the `// Group E` earthwork block near
`pipe-bedding-backfill`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (uplift = water unit wt x pi/4 x OD^2; FS = resisting/uplift, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the empty-no-backfill cross-check);
`test/fixtures/compute-map.js` (`pipe-flotation` -> `computePipeFlotation`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `pipe-bedding-backfill` / `annular-grout-volume` / `submerged-earth-pressure`);
`data/search/aliases.json` (5 collision-checked aliases: "pipe flotation", "buried pipe buoyancy", "anti-flotation
backfill", "empty pipe float", "pipe uplift check"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring the
`crane-ground-bearing`-style verdict renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the uplift, the factor of safety, the required
backfill, and the error seams (non-positive OD, water unit weight, target FS; negative weights). The calc-earthwork.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,279 -> 1,280.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(62.4 * (PI/4) * 4^2 -> 784 lb/ft uplift, FS 1.40).

## 5. Roadmap position

Opens the underground-utility check vein beside the pipe take-off tiles: pairs with the coming `restrained-pipe-length`
and `hdd-pullback`, serving the utility contractor (construction / plumbing). Stays evidence-driven; the design engineer
governs.
