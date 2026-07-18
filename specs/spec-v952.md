# roughlogic.com Specification v952 -- Taylor Tool-Life vs Cutting Speed (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v951.md. Machining-productivity sweep, beside the
> accepted `cutting-speed-rpm` (speeds and feeds) tile.
>
> **The gap, and the evidence for it.** The catalog gives spindle speed and feed from surface speed, but nothing relates
> cutting speed to TOOL LIFE -- the Taylor equation every machinist uses to trade cycle time against insert cost. Grep
> confirmed no tool-life / Taylor tile. The number this settles: at C = 300, n = 0.2, cutting at 200 sfm the tool lasts
> **7.6 minutes**, and dropping to 174 sfm stretches it to 15.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since the Taylor fit relates speed and life through
calibrated constants), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input or a non-positive C, n, cutting speed, or target life returns `{ error }`. Citation discipline
(v19/v22): the Taylor tool-life equation by name (F.W. Taylor, 1907), `GOVERNANCE.general`; the note states that C is the
speed for a 1-minute life and n is the tool-material exponent (~0.1-0.15 HSS, 0.2-0.4 carbide), that life is very
sensitive to speed because n is small, and that the base form fixes feed and depth (the extended Taylor equation adds
them) -- the insert manufacturer's data and the tool/work/coolant combination govern.

## 2. The tile

### 2.1 `taylor-tool-life` -- Taylor Tool-Life vs Cutting Speed

```
inputs:
  taylor_c          Taylor constant C (sfm at 1-minute tool life), default 300
  taylor_n          Taylor exponent n (~0.125 HSS, ~0.25 carbide), default 0.2
  cutting_speed_sfm actual cutting speed (sfm), default 200
  target_life_min   target tool life (min), default 15

tool_life_min             = (taylor_c / cutting_speed_sfm) ^ (1 / taylor_n)   [from V x T^n = C]
speed_for_target_life_sfm = taylor_c / target_life_min ^ taylor_n
```

**Pinned worked example.** C = 300, n = 0.2, cutting at 200 sfm: `T = (300/200)^5 = 1.5^5 = ` **7.59 min**; the speed for
a 15-min life is `300 / 15^0.2 = ` **174.5 sfm**. Cross-check: cutting at C itself (300 sfm) gives exactly the **1-minute**
reference life (C is defined as the 1-minute-life speed), and faster speeds give monotonically shorter life.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`, beside `cutting-speed-rpm`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (Taylor tool-life equation, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the 1-minute-life cross-check, pinning the life and the speed-for-target-life);
`test/fixtures/compute-map.js` (`taylor-tool-life` -> `computeTaylorToolLife`, module `../../calc-machining.js`);
`scripts/related-tiles.mjs` (-> `cutting-speed-rpm` / `cutting-diameter-for-rpm` / `tap-drill-size`); `data/search/
aliases.json` (5 collision-checked aliases: "taylor tool life", "tool life equation", "cutting speed tool life", "tool
life exponent", "insert tool life"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`MACHINING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-machining declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning both directions of the Taylor relation, the 1-minute-life anchor, the
monotonicity, the inverse round-trip, and the error seams. The calc-machining.js gzip cap is watched at build (raised
for this tile). Home tile count 1,400 -> 1,401.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(C 300 / n 0.2 / 200 sfm -> 7.59 min).

## 5. Roadmap position

Machining productivity beside `cutting-speed-rpm`, serving the machinist / CNC operator (machinist / mechanic).
Deliberately the base one-variable Taylor form; the extended equation (feed and depth), the insert manufacturer's data,
and the machine and tool/work/coolant combination govern the real edge life. Stays evidence-driven. Continues the
machining-productivity sweep at 1 new spec (v952).
