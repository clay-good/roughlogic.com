# roughlogic.com Specification v1199 -- Pitot Traverse Airflow from Point Readings (calc-velocity.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-04). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-velocity.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v1198.md.
>
> **The gap, and the evidence for it.** The landed `pitot-traverse-cfm` tile (spec-v385) takes ONE already-averaged
> velocity pressure and its own citation flags the shortcut -- it even mis-stated the fix ("a root-mean-square of the VP
> readings is more exact"). The methodologically-correct field method is to convert each equal-area point's velocity
> pressure to a velocity and average the VELOCITIES, because velocity is what integrates to flow. No tile did that; a
> technician with a column of raw traverse readings had to average them by hand, and averaging the pressures first
> over-reads.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the sibling
`pitot-traverse-cfm` (same Group C, same 4005 standard-air constant and duct-area) plus an array input parsed from a
textarea (the `differential-leveling` precedent). The v18/v21 contract: a non-array or empty `vp_readings`, any
non-finite or non-positive reading, or a non-positive `w`/`h` returns `{ error }`. Citation discipline (v19/v22):
ASHRAE Fundamentals / AABC / NEBB field practice by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** --
`V = 4005 sqrt(VP)` for standard air is a published field relation.

## 2. The tile

### 2.1 `pitot-traverse-average` -- Pitot Traverse Airflow from Point Readings (Velocity-Averaged)

```
inputs:
  vp_readings   velocity pressure at each equal-area traverse point (in. w.c.), one per line
  w_in, h_in    duct width and height (in)

per point:   V_i   = 4005 sqrt(VP_i)                 (standard air, 0.075 lb/ft^3)
correct:     V_avg = mean(V_i);   A = (w h)/144;   CFM = V_avg A
shortcut:    V_vpavg = 4005 sqrt(mean VP_i)          (the pitot-traverse-cfm method)
over-read:   overread_pct = (V_vpavg / V_avg - 1) x 100   (>= 0 always, = 0 iff uniform)
```

**Pinned worked examples (verified from first principles).** Four points 0.09 / 0.16 / 0.25 / 0.16 in. w.c. in a 24 x 12
duct: point velocities 1201.5 / 1602 / 2002.5 / 1602 fpm, mean **1,602 fpm**, area 2.0 ft^2, **3,204 CFM**. The
single-average-VP shortcut takes sqrt of the mean VP 0.165 -> 1,626.84 fpm and 3,253.68 CFM, **1.55 percent high**,
because the square root is concave (Jensen's inequality). The seams the fuzzer pins: the strict inequality
`V_vpavg > V_avg` across several varied traverses, the over-read identity, and uniform readings collapsing the over-read
to exactly 0.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `pitot-traverse-cfm`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry; two `test/fixtures/worked-examples.json` rows (the main example and the uniform cross-check,
pinning `v_avg_fpm`, `cfm`, `v_vp_average_fpm`, `overread_pct`, `point_count`); `test/fixtures/compute-map.js` and
`test/fixtures/renderer-map.js` (spec-v1191 reachability parity); `test/unit/bounds-fuzzer.test.js` (the new fuzzer
block); `scripts/related-tiles.mjs` (<-> `pitot-traverse-cfm`, `duct-velocity-pressure`, `fan-affinity-laws`,
`grille-face-velocity`); `data/search/aliases.json` (4 collision-checked aliases; alias shards regenerated); the
`VELOCITY_RENDERERS` entry (bespoke renderer with a textarea, degrades to compute introspection over MCP); the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index. `calc-velocity.js` fits within its cap. Also
corrected the sibling `pitot-traverse-cfm`'s citation and in-renderer citation string, which mis-stated the fix as a
root-mean-square of the VP readings; they now point at this tile for the correct velocity average. Home tile count
1,571 -> 1,572 (index.html JSON-LD + hero lede, AGENTS.md). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` (calc-velocity.js
under its cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.09/0.16/0.25/0.16 in a 24 x 12 duct -> 1,602 fpm, 3,204 CFM, 1.55 percent over-read).

## 5. Roadmap position

Closes a self-declared, mis-stated gap: the sibling tile named the shortcut and got the correction slightly wrong. The
two Pitot-traverse tiles now cover both field situations -- a single average VP, and a column of raw point readings
averaged the way NEBB/AABC/ASHRAE require -- and the over-read output makes the size of the shortcut error visible.
