# roughlogic.com Specification v632 -- Hydraulic Jump: Sequent Depth and Energy Loss (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`**
> (Group B, plumbing), no new module, group, or dependency. Inherits spec.md through spec-v631.md.
>
> **The gap, and the evidence for it.** Spec-v304 (`channel-froude-number`) classifies the open-channel regime and
> its note ends with "the hydraulic-jump conjugate depth" as one of "the deliberate next follow-ons"; the tile's own
> text calls a supercritical flow "the setup for a hydraulic jump." When rapid (supercritical) flow meets a slower
> tailwater it jumps abruptly to a deeper, tranquil (subcritical) depth, dissipating energy -- the mechanism a
> stilling basin below a spillway or culvert is designed around. Belanger's momentum relation gives the sequent
> (conjugate) depth in closed form from the upstream Froude number, and the specific-energy drop across the jump is
> the head the basin has to kill. The number this settles: a 10 ft channel carrying 100 cfs at a shooting 0.8 ft
> depth (Fr1 = 2.46) jumps to **2.42 ft** and throws away **0.55 ft** of head -- a **17%** energy loss that shows up
> as the turbulence the basin must contain.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`channel-froude-number` sibling: the width, depths, and energy loss are `L`, the discharge is `L^3 T^-1`, the
velocities are `L T^-1`, and the Froude numbers and efficiency are `dimensionless`. `g = 32.2 ft/s^2` is universal.
The v18/v21 contract: any non-finite input, a non-positive width, discharge, or upstream depth, or an upstream flow
that is not supercritical (Froude number at or below 1, where no jump forms) returns `{ error }`. Citation
discipline (v19/v22): the Belanger momentum (sequent-depth) relation for a rectangular channel by name, as compiled
in Chow (Open-Channel Hydraulics); the note states that **the sequent depth is the momentum conjugate of the
upstream supercritical depth (not the downstream normal depth, which the tailwater must supply for the jump to sit
here), the energy loss is the specific-energy drop across the jump, and this is the rectangular, horizontal, prismatic
case** -- a design aid, not a substitute for the engineer of record's stilling-basin design.

## 2. The tile

### 2.1 `hydraulic-jump` -- Sequent Depth and Energy Killed in a Hydraulic Jump

```
inputs:
  b_ft     ft     channel width (> 0)
  q_cfs    cfs    discharge (> 0)
  y1_ft    ft     upstream (supercritical) depth (> 0; must give Fr1 > 1)

V1  = q_cfs / (b_ft x y1_ft)                          [ft/s]
Fr1 = V1 / sqrt(g x y1_ft)                            [-]   (must be > 1)
y2  = (y1_ft / 2) x (sqrt(1 + 8 Fr1^2) - 1)           [ft]  (Belanger sequent depth)
V2  = q_cfs / (b_ft x y2),  Fr2 = V2 / sqrt(g y2)     [-]   (subcritical)
dE  = (y2 - y1_ft)^3 / (4 x y1_ft x y2)               [ft]  (specific-energy loss)
eff = (y2 + V2^2/2g) / (y1_ft + V1^2/2g)              [-]   (downstream energy / upstream energy)
```

**Pinned worked example (a weak jump below a chute).** b = 10 ft, Q = 100 cfs, y1 = 0.8 ft: `V1 = 12.5 ft/s`,
`Fr1 = 12.5 / sqrt(32.2 x 0.8) = ` **2.46** (supercritical), `y2 = (0.8/2)(sqrt(1 + 8 x 2.46^2) - 1) = ` **2.42 ft**,
`Fr2 = ` **0.47** (subcritical), `dE = (2.42 - 0.8)^3 / (4 x 0.8 x 2.42) = ` **0.55 ft**, energy efficiency **83%**.
**Cross-check (a strong jump, more discharge).** Q = 200 cfs at the same 0.8 ft: `Fr1 = ` **4.93**, `y2 = ` **5.19
ft**, `dE = ` **5.10 ft** -- a far bigger jump that dissipates most of the upstream energy, which is why a stilling
basin is sized to the Froude number, not just the flow.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, beside `channel-froude-number`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Belanger / Chow, the note per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`hydraulic-jump` -> `computeHydraulicJump` in `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (-> `channel-froude-number` / `weir-flow` / `manning-slope` where present);
`data/search/aliases.json` ("hydraulic jump", "sequent depth", "conjugate depth", "stilling basin energy", plus
question rows); `PLUMBING_RENDERERS["hydraulic-jump"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `channel-froude-number`) and the id
added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the Fr2 < 1 < Fr1
(jump crosses critical) property, the momentum-symmetry identity, and the error seams (non-finite, non-positive
width / discharge / depth, subcritical upstream). Group B has no exact audit-count assertion and the mechanical-
governance test is an explicit list, so no count bump. The calc-plumbing.js gzip cap is expected to hold (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Fr1 2.46, y2 2.42 ft, dE 0.55 ft).

## 5. Roadmap position

Completes the open-channel pair spec-v304 opened with `channel-froude-number`: the regime classification and now the
jump that carries a supercritical flow back to subcritical. The specific-energy diagram spec-v304 also named remains
a deliberate future follow-on. Further Group B growth stays evidence-driven.
