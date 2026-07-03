# roughlogic.com Specification v304 -- Open-Channel Froude Number, Flow Regime, and Critical Depth (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v302..v304 (the site-hydraulics depth trio -- time of
> concentration (v302), orifice discharge (v303), the open-channel flow regime (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `manning-slope` sizes a channel slope and `weir-flow`
> measures flow over a crest, but neither tells you whether the flow is subcritical or supercritical -- the Froude-number
> regime that decides whether a channel forms a hydraulic jump, whether a slope is stable, and where the critical depth
> controls. Adds one tile to the existing **`calc-plumbing.js`** module (Group B); no new group, trade, or dependency.
> Inherits spec.md through spec-v303.md.
>
> **The gap, and the evidence for it.** For open-channel flow the Froude number `Fr = V/sqrt(g D)` (with `V` the mean
> velocity and `D` the hydraulic depth) classifies the regime: `Fr < 1` subcritical (tranquil, downstream-controlled),
> `Fr = 1` critical, `Fr > 1` supercritical (rapid, upstream-controlled). For a rectangular channel the critical depth is
> `yc = (q^2/g)^(1/3)` with `q = Q/b` the unit discharge, and the flow is subcritical when the actual depth exceeds `yc`.
> For a 4 ft wide channel carrying 50 cfs at a 2 ft depth, `V = 50/(4 x 2) = 6.25 ft/s`, `Fr = 6.25/sqrt(32.2 x 2) = 0.78`
> (subcritical), and `yc = (12.5^2/32.2)^(1/3) = 1.69 ft`, so the 2 ft depth sits above critical -- consistent. Drop the
> depth to 1 ft and `Fr = 2.2` (supercritical): the same channel, a different regime, and the difference between a stable
> flow and a hydraulic jump. The Manning tile sizes the channel; this tile reads its behavior.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The channel width `b`, flow
depth `y`, and critical depth `yc` are lengths (ft); the discharge `Q` and unit discharge `q` are a volumetric flow (cfs)
and flow per width (cfs/ft); the velocity `V` is a speed (ft/s); the Froude number `Fr` is dimensionless; the regime is a
categorical label. The v18/v21 contract: any non-finite input, or a width, depth, or discharge at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the open-channel Froude classification by name;
`editionNote` names **the Froude number `Fr = V/sqrt(g D)` (`g = 32.2 ft/s^2`, `D = A/T` the hydraulic depth, equal to `y`
for a wide/rectangular section), the subcritical/critical/supercritical regimes at `Fr <> 1`, and the rectangular critical
depth `yc = (q^2/g)^(1/3)` with `q = Q/b`, as compiled in Chow's open-channel-hydraulics reference**, and states that **this
returns the regime and rectangular critical depth for a prismatic rectangular channel -- it uses `D = y` (rectangular), does
not compute the normal depth (that is Manning, `manning-slope`), the hydraulic-jump conjugate depth, or a trapezoidal/
irregular section's critical depth; and this is a design aid, not a substitute for a licensed engineer's hydraulic design**
-- the engineer of record governs.

## 2. The tile

### 2.1 `channel-froude-number` -- Open-Channel Froude Number, Regime, and Critical Depth

```
inputs:
  b_ft    ft     rectangular channel width
  Q_cfs   cfs    discharge
  y_ft    ft     flow depth

V   = Q_cfs / (b_ft * y_ft)                      ; mean velocity, ft/s
Fr  = V / sqrt(32.2 * y_ft)                      ; Froude number (D = y for rectangular)
regime = Fr < 1 ? "subcritical" : Fr > 1 ? "supercritical" : "critical"
q   = Q_cfs / b_ft                               ; unit discharge, cfs/ft
yc  = (q^2 / 32.2)^(1/3)                          ; critical depth, ft
```

**Pinned worked example (a 4 ft channel, 50 cfs, 2 ft deep).** `b = 4`, `Q = 50`, `y = 2`: `V = 50/8 = 6.25 ft/s`;
`Fr = 6.25/sqrt(32.2 x 2) = 6.25/8.025 = 0.78` -> **subcritical**; `q = 12.5 cfs/ft`, `yc = (12.5^2/32.2)^(1/3) = 1.69 ft`,
and `y = 2 > yc = 1.69` confirms subcritical. **Cross-check (drop the depth to 1 ft).** `V = 50/4 = 12.5 ft/s`,
`Fr = 12.5/sqrt(32.2) = 2.20` -> **supercritical**, and `y = 1 < yc = 1.69` agrees -- the same flow, shallower and faster,
crosses critical depth, the setup for a hydraulic jump downstream. The non-finite and non-positive error paths bracket the
result.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","civil"]`, matching the drainage tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the Froude classification, `editionNote` naming `Fr = V/sqrt(g D)`, the
regimes, `yc = (q^2/g)^(1/3)`, and the rectangular, not-normal-depth, not-jump caveats);
`test/fixtures/worked-examples.json` (the subcritical example + the supercritical cross-check);
`test/fixtures/compute-map.js` (`channel-froude-number` -> `computeChannelFroudeNumber` in `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (-> `manning-slope` / `weir-flow` / `orifice-flow` / `pipe-velocity`);
`data/search/aliases.json` ("Froude number", "subcritical supercritical", "critical depth", "open channel regime",
"hydraulic jump", "channel flow regime", "yc critical depth", "tranquil rapid flow", "channel Froude"); the id appended to
the existing plumbing renderers block in `app.js`; the `// dims:` annotation (`b`/`y`/`yc` length, `Q` volumetric flow, `V`
speed, `Fr` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
regime-boundary at `Fr = 1`, the `yc`-versus-`y` consistency with the regime, and the non-positive / non-finite error
seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the regime and `yc` assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `V` / `Fr` / `yc` / regime stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (4 ft, 50 cfs, 2 ft -> Fr 0.78 subcritical).

## 5. Roadmap position

Closes the site-hydraulics depth batch (v302..v304) in `calc-plumbing.js`: time of concentration, orifice discharge, and
the Froude regime now stand beside the rational method, Manning slope, and weir flow. The trapezoidal/irregular critical
depth, the hydraulic-jump conjugate depths and energy loss, and a specific-energy diagram are the deliberate next follow-ons
once the trio lands.
