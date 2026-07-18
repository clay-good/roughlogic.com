# roughlogic.com Specification v979 -- Room Cavity Ratio (RCR) for CU Lookup (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v978.md. Lighting-design sweep, directly
> upstream of the accepted `lumen-method` tile.
>
> **The gap, and the evidence for it.** `lumen-method` takes the coefficient of utilization (CU) as a raw input, and its
> own note says the CU comes from the fixture's report at the room's cavity ratio -- but nothing computes that cavity
> ratio. Grep confirmed no RCR / zonal-cavity tile. The number this settles: a 40 x 30 ft room with an 8 ft cavity has an
> RCR of **2.33**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a ratio from feet), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive length / width / cavity
height returns `{ error }`. Citation discipline (v19/v22): the IES zonal-cavity RCR by name, `GOVERNANCE.general`; the
note stresses that the cavity height is the luminaire plane to the WORK plane (not floor-to-ceiling), that a high RCR
(tall/narrow room) gives a lower CU, and that the RCR (with the surface reflectances) reads the CU off the fixture's IES
photometric file, which then feeds the lumen method -- the photometric file and the actual reflectances govern the CU.

## 2. The tile

### 2.1 `room-cavity-ratio` -- Room Cavity Ratio (RCR) for CU Lookup

```
inputs:
  room_length_ft   room length (ft), default 40
  room_width_ft    room width (ft), default 30
  cavity_height_ft cavity height: luminaire plane to the work plane (ft), default 8

room_cavity_ratio = 5 x cavity_height_ft x (room_length_ft + room_width_ft) / (room_length_ft x room_width_ft)
```

**Pinned worked example.** 40 x 30 ft room, 8 ft luminaire-to-workplane cavity: `RCR = 5 x 8 x (40+30)/(40 x 30) = 2800/
1200 = ` **2.33**. Cross-check: a tall, narrow **12 x 20 ft** room with a 10 ft cavity has a high `RCR = 5 x 10 x 32/240
= ` **6.67** -- more light hits the walls, so a lower CU.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `lumen-method`); a `tile-meta.js` `_TILES` entry (`A`);
a `citations.js` entry (IES zonal-cavity RCR, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the base
example plus the tall-narrow cross-check, pinning the RCR); `test/fixtures/compute-map.js` (`room-cavity-ratio` ->
`computeRoomCavityRatio`, module `../../calc-elecdesign.js`); `scripts/related-tiles.mjs` (-> `lumen-method` /
`lighting-density` / `point-illuminance`); `data/search/aliases.json` (5 collision-checked aliases: "room cavity ratio",
"rcr lighting", "cavity ratio", "coefficient of utilization lookup", "zonal cavity"), then `node scripts/build-alias-
shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the `ELECDESIGN_RENDERERS` map, and the id added to
the calc-elecdesign declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the RCR, the tall-narrow / cavity-height
/ bigger-room directions, the square-room identity, and the error seams. The calc-elecdesign.js gzip cap and the Group A
group shell are watched at build. Home tile count 1,427 -> 1,428.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(40 x 30 / 8 -> 2.33).

## 5. Roadmap position

Lighting design beside `lumen-method`, serving the electrical / lighting designer (electrical). Deliberately the room
shape number; the fixture's IES photometric file, the actual ceiling/wall/floor reflectances, and the CU they yield
govern the lumen-method count that follows. Stays evidence-driven. Continues the lighting-design sweep at 1 new spec
(v979).
