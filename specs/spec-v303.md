# roughlogic.com Specification v303 -- Orifice Discharge Flow (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v302..v304 (the site-hydraulics depth trio -- time of
> concentration (v302), the orifice discharge (this spec), the open-channel Froude regime (v304)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog has weir flow (`weir-flow`) and pipe
> velocity (`pipe-velocity`) but no orifice discharge -- the flow through a sharp-edged hole under a head, the equation that
> sizes a detention-pond outlet, a tank drain, or a flow-restrictor plate. Adds one tile to the existing
> **`calc-plumbing.js`** module (Group B); no new group, trade, or dependency. Inherits spec.md through spec-v302.md.
>
> **The gap, and the evidence for it.** The discharge through a submerged or free orifice is `Q = Cd A sqrt(2 g h)`, where
> `Cd` is the discharge coefficient (about 0.6 for a sharp-edged orifice), `A` the orifice area, `h` the head to the orifice
> center, and `g = 32.2 ft/s^2`. For a 6 in diameter orifice (`A = 0.196 ft^2`) under a 4 ft head with `Cd = 0.6`,
> `Q = 0.6 x 0.196 x sqrt(2 x 32.2 x 4) = 1.89 cfs = 849 gpm` -- the release a detention pond sheds through that outlet at
> that stage, the number that sizes the plate to hold the post-development peak to the pre-development rate. The flow scales
> with the square root of the head, so doubling to a 9 ft head raises it only to 2.84 cfs. `weir-flow` handles flow over a
> crest; this tile handles flow through a hole.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The orifice diameter `d` is a
length (in, converted to ft) giving the area `A` (ft^2); the head `h` is a length (ft); the discharge coefficient `Cd` is
dimensionless; the discharge `Q` is a volumetric flow (reported in cfs and gpm). The v18/v21 contract: any non-finite input,
or a diameter, head, or coefficient at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the orifice-equation by name; `editionNote` names **the orifice discharge `Q = Cd A sqrt(2 g h)`
with `g = 32.2 ft/s^2`, `Cd ~ 0.6` for a sharp-edged orifice (~0.8 short tube, ~0.98 rounded), and the head measured to the
orifice centroid**, and states that **this returns the free/submerged orifice discharge for a small orifice under a steady
head -- it assumes the orifice is small relative to the head (uniform velocity across it), uses the entered `Cd`, and does
not integrate the falling head of a draining tank (the time-to-drain is a follow-on) or account for a partially submerged
or gated outlet; and this is a design aid, not a substitute for a licensed engineer's drainage design** -- the engineer of
record governs.

## 2. The tile

### 2.1 `orifice-flow` -- Orifice Discharge Flow

```
inputs:
  d_in    in     orifice diameter
  h_ft    ft     head to the orifice center
  Cd      -      discharge coefficient (default 0.60 sharp-edged)

A_ft2 = pi/4 * (d_in/12)^2                        ; orifice area, ft^2
Q_cfs = Cd * A_ft2 * sqrt(2 * 32.2 * h_ft)        ; discharge, cfs
Q_gpm = Q_cfs * 448.831                           ; discharge, gpm
```

**Pinned worked example (a 6 in sharp-edged orifice under a 4 ft head).** `d = 6`, `h = 4`, `Cd = 0.6`:
`A = pi/4 x (0.5)^2 = 0.196 ft^2`; `Q = 0.6 x 0.196 x sqrt(2 x 32.2 x 4) = 0.6 x 0.196 x 16.05 = 1.89 cfs = 849 gpm`.
**Cross-check (raise the head to 9 ft).** `Q = 0.6 x 0.196 x sqrt(2 x 32.2 x 9) = 0.6 x 0.196 x 24.07 = 2.84 cfs = 1,273 gpm`
-- a `2.25x` head raises the flow only `1.5x` (`= sqrt(9/4)`), the square-root-of-head behavior that makes an orifice a
gentle stage-discharge control for a detention pond. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","civil"]`, matching the drainage tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the orifice equation, `editionNote` naming `Q = Cd A sqrt(2 g h)`,
`Cd` values, the head-to-centroid, and the small-orifice, steady-head, not-falling-head caveats);
`test/fixtures/worked-examples.json` (the 4 ft example + the 9 ft cross-check); `test/fixtures/compute-map.js`
(`orifice-flow` -> `computeOrificeFlow` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `weir-flow` /
`time-of-concentration` / `pipe-velocity` / `detention-time`); `data/search/aliases.json` ("orifice flow", "orifice
discharge", "detention outlet", "tank drain flow", "Cd sqrt 2gh", "flow through a hole", "restrictor plate", "pond outlet
sizing", "orifice equation"); the id appended to the existing plumbing renderers block in `app.js`; the `// dims:`
annotation (`d` length, `h` length, `Cd` dimensionless, `Q` volumetric flow); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the square-root-of-head scaling, the cfs-to-gpm conversion, and the
non-positive / non-finite error seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the square-root-of-head assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `A` / `Q_cfs` / `Q_gpm` stack wraps
on a phone); render-no-nan + a11y sweep, output read to the value (6 in, 4 ft head -> 1.89 cfs, 849 gpm).

## 5. Roadmap position

Middle of the site-hydraulics depth batch (v302..v304) in `calc-plumbing.js`, adding the orifice control beside the weir.
The open-channel Froude regime (v304) follows. The time-to-drain a tank under a falling head, a compound weir-plus-orifice
stage-discharge curve, and a partially-submerged orifice correction are the deliberate next follow-ons once the trio lands.
