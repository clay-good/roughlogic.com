# roughlogic.com Specification v301 -- Shear Friction Across an Interface (ACI 318-19 22.9) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v299..v301 (the reinforced-concrete depth-2 trio -- min
> thickness (v299), doubly-reinforced beam (v300), shear friction (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `rc-beam-shear` handles diagonal-tension (web) shear
> in a beam, but a different mechanism governs shear transferred across a defined plane -- a cold joint, a precast corbel
> interface, a bracket, a wall-to-footing joint -- where the friction on the roughened crack, clamped by reinforcement
> crossing it, carries the shear. The catalog has no shear-friction tile. Adds one tile to the existing **`calc-concrete.js`**
> module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v300.md.
>
> **The gap, and the evidence for it.** ACI 318-19 22.9 takes the shear-friction strength as `Vn = mu Avf fy`, where `Avf`
> is the area of reinforcement crossing the shear plane, `fy` its yield, and `mu` the friction coefficient -- `1.4 lambda`
> for concrete cast monolithically, `1.0 lambda` for concrete against roughened hardened concrete, `0.6 lambda` against
> unroughened, `0.7 lambda` against as-rolled steel -- capped by `min(0.2 f'c Ac, (480 + 0.08 f'c) Ac, 1600 Ac)` for the
> normalweight monolithic/roughened case, with `phi = 0.75`. For 2.0 in^2 of Grade 60 dowels crossing a roughened cold joint
> (`mu = 1.0`) on a 12 x 16 in interface of 4,000 psi concrete, `Vn = 1.0 x 2.0 x 60 = 120 kip`, under the `153.6 kip` cap,
> so `phi Vn = 90 kip` -- the shear the joint transfers, sized by the dowels across it, not by the beam-web equation.
> `rc-beam-shear` handles diagonal tension; this tile handles interface slip.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The friction reinforcement
`Avf` and interface area `Ac` are areas (in^2); `fy` and `f'c` are stresses (entered psi); the friction coefficient `mu`
and lightweight factor `lambda` are dimensionless; the nominal and design shear strengths are forces (kip). The v18/v21
contract: any non-finite input, or any area/strength at or below zero, returns `{ error }`; the interface-condition input
selects `mu`, and the cap governs when `mu Avf fy` exceeds it. Citation discipline (v19/v22): `GOVERNANCE.general` over the
ACI 318-19 22.9 provisions by name; `editionNote` names **the ACI 318-19 22.9 shear-friction strength `Vn = mu Avf fy`, the
`mu` values (`1.4 lambda` monolithic, `1.0 lambda` roughened, `0.6 lambda` unroughened, `0.7 lambda` to steel), the maximum
`Vn = min(0.2 f'c, (480 + 0.08 f'c), 1600) Ac` for normalweight monolithic/roughened interfaces, and `phi = 0.75`**, and
states that **this returns the shear transferred across a single well-defined plane by friction -- it uses the perpendicular
(no permanent net tension) case (a net tension across the plane requires added reinforcement `Avf = Vu/(phi fy mu) + An`),
takes the reduced caps for lightweight or other interface conditions as a follow-on, and does not check the anchorage/
development of the crossing bars or the concrete bracket/corbel bearing; and this is a design aid, not a substitute for a
licensed engineer's design** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `rc-shear-friction` -- Shear Friction Across an Interface (ACI 318-19 22.9)

```
inputs:
  Avf_in2   in^2   reinforcement area crossing the shear plane
  fy_psi    psi    reinforcement yield strength
  Ac_in2    in^2   area of the shear interface
  fc_psi    psi    concrete compressive strength
  interface -      monolithic | roughened | unroughened | steel
  lambda    -      lightweight factor (default 1.0)

mu  = { monolithic:1.4, roughened:1.0, unroughened:0.6, steel:0.7 }[interface] * lambda
Vn0 = mu * Avf_in2 * fy_psi                                          ; lb
cap = min(0.2*fc_psi, 480 + 0.08*fc_psi, 1600) * Ac_in2             ; lb (normalweight mono/roughened)
Vn  = min(Vn0, cap)                                                 ; report in kip
phiVn = 0.75 * Vn
```

**Pinned worked example (2.0 in^2 Grade 60 dowels across a roughened cold joint, 12 x 16 in interface, 4,000 psi).**
`Avf = 2.0`, `fy = 60,000`, `Ac = 192`, `fc = 4,000`, `interface = roughened` (`mu = 1.0`): `Vn0 = 1.0 x 2.0 x 60,000 = 120,000 lb = 120 kip`;
`cap = min(0.2 x 4,000, 480 + 0.08 x 4,000, 1,600) x 192 = min(800, 800, 1,600) x 192 = 800 x 192 = 153,600 lb = 153.6 kip`;
`Vn = min(120, 153.6) = 120 kip`; `phi Vn = 90 kip`. **Cross-check (add dowels to 3.0 in^2, the cap now governs).**
`Vn0 = 1.0 x 3.0 x 60 = 180 kip`, above the `153.6 kip` cap, so `Vn = 153.6 kip` and `phi Vn = 115.2 kip` -- past a point,
more dowels do nothing because the concrete interface itself limits the transfer, the reason shear friction has a ceiling.
The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the `rc-*` tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ACI 318-19 22.9 provisions, `editionNote` naming
`Vn = mu Avf fy`, the `mu` values, the cap, `phi = 0.75`, and the no-net-tension, single-plane, not-anchorage caveats);
`test/fixtures/worked-examples.json` (the roughened-joint example + the cap-governs cross-check);
`test/fixtures/compute-map.js` (`rc-shear-friction` -> `computeRcShearFriction` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-shear` / `rebar-lap-splice` / `anchor-embedment` / `rc-development-length`);
`data/search/aliases.json` ("shear friction", "ACI 22.9", "cold joint shear", "interface shear transfer", "corbel shear",
"dowel shear", "mu Avf fy", "shear across crack", "construction joint shear"); the id appended to the existing concrete
renderers block in `app.js`; the `// dims:` annotation (areas area, strengths stress, `mu`/`lambda` dimensionless, shears
force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `mu` interface map,
the min() cap selection, and the non-positive / non-finite error seams. No new module; re-pin `calc-concrete.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the cap-governs assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Vn0` / `cap` / `Vn` / `phiVn` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (2.0 in^2 roughened -> 120 kip, 90 kip design).

## 5. Roadmap position

Closes the reinforced-concrete depth-2 batch (v299..v301) in `calc-concrete.js`: minimum thickness, doubly-reinforced
flexure, and interface shear friction round out the member set beside the strength and development tiles. The net-tension
`Avf = Vu/(phi fy mu) + An` case, the lightweight and non-monolithic reduced caps, and a corbel/bracket bearing tile are the
deliberate next follow-ons once the trio lands.
