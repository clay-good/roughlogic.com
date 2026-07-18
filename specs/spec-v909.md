# roughlogic.com Specification v909 -- Bar / Tube Stock Cut List Yield (calc-fab.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v908.md. Fabrication material-takeoff sweep,
> mirroring the accepted `coil-length` stock-material precedent.
>
> **The gap, and the evidence for it.** The catalog computes coil / roll stock length (`coil-length`) but nothing turns
> a **linear stock cut list** into a stick count and yield. Grep confirmed no cut-list / kerf / pieces-per-stick tile.
> Every metal shop that cuts bar, tube, or angle to length answers the same two questions: how many pieces come off one
> stick once the saw kerf is counted, and how many sticks to buy. The number this settles: a 20 ft (240 in) stick cut
> into 14.5 in pieces with a 1/8 in kerf yields **16 pieces per stick**, so 100 pieces take **7 sticks**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`coil-length` stock-material tile: the stock length, piece length, kerf, and drop carry `L`, and the pieces-per-stick,
sticks, and quantity are dimensionless. The v18/v21 contract: a non-finite or non-positive stock length, piece length,
or quantity, a negative kerf, or a piece plus kerf longer than the stock returns `{ error }`. Citation discipline
(v19/v22): the cut-list yield identity by name (pieces_per_stick = floor((stock + kerf)/(piece + kerf)); drop = stock -
[pieces x piece + (pieces - 1) x kerf]; sticks = ceil(needed / pieces_per_stick)), `GOVERNANCE.general`; the note states
that fitting N pieces on one stick takes N-1 internal saw cuts (one kerf between pieces), that the drop is the usable
remnant per stick, that this is a single-length model with no mixed-length nesting, end trim, facing, or clamping loss,
and that the cut list and the saw govern the finished count.

## 2. The tile

### 2.1 `barstock-cutlist` -- Bar / Tube Stock Cut List Yield

```
inputs:
  stock_length_in  stock stick length (in)
  piece_length_in  cut piece length (in)
  kerf_in          saw kerf (in, default 0.125)
  pieces_needed    total pieces required

pieces_per_stick  = floor( (stock_length_in + kerf_in) / (piece_length_in + kerf_in) )   [error if < 1]
material_per_stick = pieces_per_stick * piece_length_in + (pieces_per_stick - 1) * kerf_in
drop_per_stick_in = stock_length_in - material_per_stick
sticks_needed     = ceil(pieces_needed / pieces_per_stick)
total_stock_in    = sticks_needed * stock_length_in
yield_pct         = pieces_needed * piece_length_in / total_stock_in * 100
```

**Pinned worked example.** 240 in stock, 14.5 in pieces, 0.125 in kerf, 100 pieces:
`pieces_per_stick = floor((240 + 0.125)/(14.5 + 0.125)) = floor(16.42) = ` **16**;
`drop = 240 - (16 x 14.5 + 15 x 0.125) = 240 - 233.875 = ` **6.125 in**; `sticks = ceil(100/16) = ` **7**;
yield = `100 x 14.5 / 1680 = ` **86.3%**. Cross-check: a 288 in stick cut into 40 in pieces with a 1/16 in kerf yields
`floor((288 + 0.0625)/40.0625) = ` **7 per stick** with a **7.625 in** drop, so 50 pieces take **8 sticks** -- the kerf
matters more as pieces get shorter and more numerous.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["fabrication", "welding"]`, beside `coil-length`); a `tile-meta.js` `_TILES`
entry (`E`); a `citations.js` entry (cut-list yield identity, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the cross-check, pinning pieces-per-stick, drop, and sticks); `test/fixtures/compute-map.js`
(`barstock-cutlist` -> `computeBarstockCutlist`, module `../../calc-fab.js`); `scripts/related-tiles.mjs`
(-> `coil-length` / `metal-weight` / `weld-cost-per-foot`); `data/search/aliases.json` (5 collision-checked aliases:
"bar stock cut list", "cut list yield", "pieces per stick", "saw kerf yield", "how many sticks to buy"), then
`node scripts/build-alias-shards.mjs` to rebuild the per-group shards; a hand-written renderer in the `FAB_RENDERERS`
map mirroring the `coil-length` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-fab
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the pieces-per-stick, drop, stick count, total stock, yield,
and the error seams (non-positive stock / piece / quantity, negative kerf, piece longer than stock, non-finite). The
calc-fab.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build.
Lazy-loaded, absent from home first paint. Home tile count 1,357 -> 1,358.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(floor((240 + 0.125)/14.625) -> 16 per stick, 7 sticks).

## 5. Roadmap position

Fabrication material-takeoff beside `coil-length`, serving the fabricator / welder (fabrication / welding). Deliberately
an estimate; the cut list and the saw govern the finished count. Stays evidence-driven. Opens a post-construction-ops
material-takeoff sweep at 1 new spec (v909).
