# roughlogic.com Specification v807 -- Belt Power from Tension and Speed (calc-cross.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`** (Group G), no
> new module, group, or dependency. Inherits spec.md through spec-v806.md. Explore sweep #25 (entry 4), beside the
> existing `vbelt-drive` power-transmission tile.
>
> **The gap, and the evidence for it.** `vbelt-drive` sizes the belt count from a design HP and `belt-pulley` gives
> length/speed, but **no tile computes the power a belt actually transmits from its two tensions**. Grep confirmed no
> belt-power / effective-tension tile. The number this settles, and the point people miss: a 250-to-100 lb drive on a
> 6 in sheave at 1,750 rpm transmits **12.5 HP** -- and only the tension *difference* (Te = T1 - T2 = 150 lb) does the
> work.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group G
power-transmission sibling `vbelt-drive`: the tensions carry `M L T^-2` (force), the sheave diameter `L`, the speed
`T^-1`, the belt speed `L T^-1`, and the power `M L^2 T^-3`. The v18/v21 contract: a non-finite input (via
`_finiteGuard`), a non-positive sheave diameter or speed, a negative tension, or a tight-side tension below the
slack-side returns `{ error }`. Citation discipline (v19/v22): the belt-power relation by name (first-principles /
Machinery's Handbook / Gates), `GOVERNANCE.mechanical` matching the sibling; the note states that only the effective
tension Te = T1 - T2 does work (the average tension is grip, not power), so over-tensioning adds bearing load without
capacity.

## 2. The tile

### 2.1 `belt-hp-transmitted` -- Belt Power from Tension and Speed

```
inputs:
  tight_side_tension_lb   tight-side tension T1 (lb)
  slack_side_tension_lb   slack-side tension T2 (lb)
  sheave_diameter_in      sheave pitch diameter D (in)
  sheave_rpm              sheave speed N (rpm)

belt_speed_fpm       = pi * D * N / 12
effective_tension_lb = T1 - T2
power_hp             = effective_tension_lb * belt_speed_fpm / 33000
```

**Pinned worked example.** T1 250 lb, T2 100 lb, D 6 in, N 1,750 rpm: `V = pi x 6 x 1750 / 12 = ` 2,749 ft/min;
`Te = 150 lb`; `P = 150 x 2749 / 33000 = ` **12.5 HP**. Cross-check: a tighter 400/250 lb drive keeps Te at
150 lb and the power at 12.5 HP while carrying more total tension into the bearings -- over-tensioning buys wear, not capacity.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["mechanic", "hvac"]`) beside `vbelt-drive`; a `tile-meta.js` `_TILES` entry
(`G`); a `citations.js` entry (belt-power relation, `GOVERNANCE.mechanical`); `test/fixtures/worked-examples.json` (the
pinned example plus the effective-tension cross-check); `test/fixtures/compute-map.js`
(`belt-hp-transmitted` -> `computeBeltHpTransmitted`); `scripts/related-tiles.mjs` (-> `vbelt-drive` / `gear-cascade` /
`roller-chain-length`); `data/search/aliases.json` (5 collision-checked aliases: "belt power transmitted", "belt
horsepower from tension", "effective belt tension", "belt drive power capacity", "tight side slack side tension power");
the calc-cross `CROSS_RENDERERS` map entry via a non-exported renderer with T1 / T2 / D / N inputs, and the id added to
the calc-cross declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the power, the belt speed, the effective-tension
invariance, and the error seams. The calc-cross.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,255 -> 1,256.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (the
local-only module-size gate); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the
value (250 / 100 / 6 / 1750 -> 12.5 HP).

## 5. Roadmap position

Completes the belt-drive cluster in Group G (sizing via `vbelt-drive`, length/speed via `belt-pulley`, transmitted power
here). The catalog is very saturated; the sweep-25 tail continues. Stays evidence-driven.
