# roughlogic.com Specification v630 -- Tank Drain Time (Falling-Head Orifice) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`**
> (Group B, plumbing), no new module, group, or dependency. Inherits spec.md through spec-v629.md.
>
> **The gap, and the evidence for it.** Spec-v303 (`orifice-flow`) computes the steady discharge `Q = Cd A
> sqrt(2 g h)` and both its note and citation say the same thing: it "does not integrate the falling head of a
> draining tank (the time-to-drain is a follow-on)." A steady-head orifice flow answers "how fast right now"; the
> question a plumber or pond designer actually has is "how long to empty," and because the head falls as the tank
> drains, the flow keeps slowing and the answer is not just volume over the initial flow. Integrating the orifice
> equation over the falling head gives a closed form, `t = 2 A_t (sqrt(h1) - sqrt(h2)) / (Cd A_o sqrt(2 g))`. The
> number that catches people out: a 100 ft^2 tank draining through a 6 in orifice empties from 9 ft in **10.6 min**,
> but it reaches the last foot (9 ft to 1 ft) in only **7.1 min** -- the final foot alone takes another 3.5, because
> the `sqrt(h)` head drives the flow toward zero as the tank runs dry.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The tank area is
`L^2`, the orifice diameter and the two heads are `L`, the discharge coefficient is `dimensionless`, and the drain
time is `T`. The gravitational constant `g = 32.2 ft/s^2` is universal and `Cd` is the same user-entered hydraulic
coefficient the `orifice-flow` sibling already takes (~0.6 sharp-edged). The v18/v21 contract: any non-finite input,
a non-positive tank area, orifice diameter, or discharge coefficient, a negative end head, or a start head not
greater than the end head returns `{ error }`. Citation discipline (v19/v22): the falling-head (Torricelli) drain-
time integral by name; the note states that **this integrates the orifice equation over a constant-cross-section
(prismatic) tank with the head measured above the orifice, the flow slows as sqrt(h) so the last bit drains
slowest, and it assumes free discharge to atmosphere with a small orifice and a steady Cd** -- a design aid, not a
substitute for the engineer of record.

## 2. The tile

### 2.1 `tank-drain-time` -- How Long a Tank Takes to Drain Through an Orifice

```
inputs:
  tank_area_ft2   ft^2   constant (prismatic) tank cross-section area (> 0)
  d_in            in     orifice diameter (> 0)
  cd              -      discharge coefficient (~0.6 sharp-edged, > 0)
  h1_ft           ft     starting head above the orifice (> h2)
  h2_ft           ft     ending head above the orifice (>= 0, 0 = fully drained)

A_o = (pi/4) (d_in/12)^2                                        [ft^2]
t   = 2 A_t (sqrt(h1) - sqrt(h2)) / (Cd A_o sqrt(2 g))          [s]   g = 32.2 ft/s^2
```

**Pinned worked example (empty a tank).** A_t = 100 ft^2, d = 6 in (A_o = 0.196 ft^2), Cd = 0.60, from h1 = 9 ft to
empty (h2 = 0): `t = 2 x 100 x (3 - 0) / (0.60 x 0.196 x sqrt(64.4)) = 600 / 0.945 = ` **634.6 s = 10.6 min**.
**Cross-check (the slow tail).** Drain only from 9 ft to h2 = 1 ft: `t = 2 x 100 x (3 - 1) / 0.945 = ` **423.1 s =
7.1 min** -- eight of the nine feet leave in 7.1 minutes and the last foot alone takes the remaining 3.5, because the
sqrt(h) head starves the flow near the bottom.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `orifice-flow`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (Torricelli falling-head drain time, the note per §1); `test/fixtures/worked-examples.json`
(both examples); `test/fixtures/compute-map.js` (`tank-drain-time` -> `computeTankDrainTime` in
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `orifice-flow` / `weir-flow` / `detention-volume` where
present); `data/search/aliases.json` ("tank drain time", "time to empty a tank", "falling head", "torricelli drain",
plus question rows); `PLUMBING_RENDERERS["tank-drain-time"]` via a hand-written renderer (the module's `makeNumber`
/ `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `orifice-flow`) and the id added
to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the sqrt(h)-tail relation (full drain
takes more than the fraction of head suggests), and the error seams (non-finite, non-positive area / diameter / Cd,
negative end head, start head <= end head). Group B has no exact audit-count assertion and the mechanical-governance
test is an explicit list, so no count bump. The calc-plumbing.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 634.6 s, 10.6 min).

## 5. Roadmap position

Completes the orifice pair spec-v303 opened with `orifice-flow`: the steady discharge and now the time to drain a
falling head. Both are the same Cd A sqrt(2 g h) physics, one instantaneous and one integrated. A non-prismatic
(varying cross-section) tank is a natural future extension. Further Group B growth stays evidence-driven.
