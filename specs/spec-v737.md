# roughlogic.com Specification v737 -- Wire Feed Speed for a Target Deposition Rate (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v736.md. Explore sweep #12 (entry 10, final clean
> candidate).
>
> **The gap, and the evidence for it.** The `wire-feed-deposition` tile runs the melt-off geometry forward: from a wire
> feed speed it returns the deposition rate. The welder's question is the inverse -- **what wire feed speed a target
> deposition rate needs**, so the machine can be dialed in to a production rate. From
> `deposit = WFS x 60 x (pi/4 x dia^2) x 0.2836 x eff`, `WFS = deposit / (60 x (pi/4 x dia^2) x 0.2836 x eff)`. The number
> this settles: a **6 lb/hr** target on **0.035 in** wire at **92%** efficiency needs about **398 in/min**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`wire-feed-deposition` sibling: the target deposition and melt-off rates are `M T^-1` (lb/hr), the wire diameter is `L`
(in), the deposition efficiency is dimensionless, and the returned wire feed speed is `L T^-1` (in/min). It reuses the
sibling's wire-volume geometry and steel density (0.2836 lb/in3), solved for the feed speed. The v18/v21 contract: any
non-finite input, a non-positive target deposition rate, a non-positive wire diameter, or a deposition efficiency outside
(0, 1] returns `{ error }`. Citation discipline (v19/v22): the melt-off relation solved for the feed speed,
`GOVERNANCE.general` matching the sibling; the note states that the **melt-off rate is deposit / efficiency** (more wire
melts than lands -- spatter and slag), that a **smaller-diameter wire needs a much higher feed speed** for the same
deposit (the rate goes as diameter squared), and that the **WFS must be within the WPS-qualified range** with the WPS and
process governing.

## 2. The tile

### 2.1 `wire-feed-speed-for-deposition` -- Wire Feed Speed for a Target Deposition Rate

```
inputs:
  target_deposit_lb_hr   M T^-1        target deposition rate (lb/hr, > 0)
  wire_dia_in            L             wire diameter (in, > 0)
  deposition_eff         dimensionless deposition efficiency (0 < eff <= 1; default 0.92)

wire_area_in2 = pi/4 x wire_dia_in^2
wfs_in_min    = target_deposit_lb_hr / (60 x wire_area_in2 x 0.2836 x deposition_eff)
melt_lb_hr    = target_deposit_lb_hr / deposition_eff
```

**Pinned worked example.** deposit = 6 lb/hr, dia = 0.035 in, eff = 0.92:
`area = pi/4 x 0.035^2 = 0.000962 in2`, `WFS = 6 / (60 x 0.000962 x 0.2836 x 0.92) = ` **398 in/min**, melt-off = 6 / 0.92
= 6.52 lb/hr. Feeding 398 in/min back through `wire-feed-deposition` at the same wire returns a 6 lb/hr deposition rate,
the target. A finer 0.030 in wire needs a higher ~542 in/min for the same deposit.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","fabrication"]`) placed beside `wire-feed-deposition` (Group E is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (melt-off relation solved for the feed
speed, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`wire-feed-speed-for-deposition` -> `computeWireFeedSpeedForDeposition`);
`scripts/related-tiles.mjs` (-> `wire-feed-deposition` / `weld-metal-volume` / `weld-cost-per-foot`);
`data/search/aliases.json` (5 collision-checked question aliases: "wire feed speed for deposition", "what wfs to set",
...); the calc-fab `FAB_RENDERERS` map entry via a hand-written renderer (three number fields) and the id added to the
calc-fab declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeWireFeedDeposition` across a deposit/diameter/efficiency sweep, the smaller-wire-higher-speed and
more-deposit-more-speed monotonicity, and the error seams. The calc-fab.js gzip cap (raised to 26000 B in this spec)
covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,185 -> 1,186.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 398 in/min for a 6 lb/hr
target on 0.035 in wire at 92%).

## 5. Roadmap position

Pairs the forward weld tile (`wire-feed-deposition`, rate from the feed speed) with its inverse (the feed speed for a
rate), the two halves of the deposition-planning question. Closes the clean run of Explore sweep #12 (entries #4
masonry-lintel and #7 crack-control deferred as non-clean inverses; a fresh sweep opens the next batch). Further Group E
welding growth stays evidence-driven.
