# roughlogic.com Specification v801 -- Sprocket Pitch Diameter (calc-shop.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group K), no
> new module, group, or dependency. Inherits spec.md through spec-v800.md. Fresh Explore sweep (post-inverse forward
> vein), sitting directly beside the existing `roller-chain-length` (spec-v512) tile in the chain-drive cluster.
>
> **The gap, and the evidence for it.** The `roller-chain-length` tile sizes the chain but never gives the **sprocket
> pitch diameter** -- the number a machinist lays the blank out from and the number that actually sets the drive's speed
> ratio and center distance. Grep confirmed no tile computes it (`sprocket` appears only as the tooth-count input labels
> inside `roller-chain-length`). The number this settles: a 17-tooth #40 sprocket (0.5 in pitch) is **2.7211 in** pitch
> diameter, matching the published ANSI table (2.7212 in).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
sibling `roller-chain-length`: the chain pitch carries `L`, the tooth count is dimensionless, and both the pitch and
outside diameters carry `L`. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive pitch, or a
tooth count that is not a whole number of at least 3 returns `{ error }`. Citation discipline (v19/v22): the ANSI B29.1
sprocket pitch-diameter and outside-diameter relations by name, `GOVERNANCE.general` matching the sibling; the note
states that the pitch diameter runs through the chain-pin centers, that it (not the tip diameter) sets the speed ratio
and center distance, and that the manufacturer's tooth form and hub dimensions govern the finished sprocket.

## 2. The tile

### 2.1 `sprocket-pitch-diameter` -- Sprocket Pitch Diameter (ANSI B29.1)

```
inputs:
  chain_pitch_in    roller-chain pitch p (in, #40 = 0.5)
  tooth_count_n     sprocket tooth count N (whole number, >= 3)

pitch_diameter_in    = p / sin(180 deg / N)
outside_diameter_in  = p (0.6 + cot(180 deg / N))
```

**Pinned worked example.** Chain pitch 0.5 in (#40), 17 teeth: `PD = 0.5 / sin(180/17 deg) = ` **2.7211 in**; the maximum
outside (tip) diameter `OD = 0.5 (0.6 + cot(180/17 deg)) = ` **2.9748 in**. Cross-check: a 25-tooth #50 sprocket
(0.625 in pitch) is 4.9867 in pitch diameter, matching the published 4.9862 in.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`) beside `roller-chain-length`; a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (ANSI B29.1, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the #50 cross-check); `test/fixtures/compute-map.js`
(`sprocket-pitch-diameter` -> `computeSprocketPitchDiameter`); `scripts/related-tiles.mjs` (-> `roller-chain-length` /
`spur-gear-geometry` / `gear-mph-rpm`); `data/search/aliases.json` (5 collision-checked aliases: "sprocket pitch
diameter", "sprocket diameter", "sprocket outside diameter", "chain sprocket size", "sprocket blank diameter"); the
calc-shop `SHOP_RENDERERS` map entry via a non-exported renderer (so no DOM-sentinel row) with pitch and tooth-count
inputs, and the id added to the calc-shop declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both diameters, the
tip-outside-pitch ordering, the pitch/tooth monotonicity, and the error seams. The calc-shop.js gzip cap is unchanged.
Verify at build, including `check-shells` (the group-shell gzip cap). Lazy-loaded, absent from home first paint. Home
tile count 1,249 -> 1,250.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (0.5 in / 17 teeth -> 2.7211 in pitch diameter).

## 5. Roadmap position

Completes the chain-drive cluster (`roller-chain-length` sizes the chain; this sizes the sprocket) in the shop-math
Group K. The catalog remains very saturated; the next batch continues the fresh forward sweep. Stays evidence-driven.
