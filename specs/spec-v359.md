# roughlogic.com Specification v359 -- Shaft Torsional Shear Stress and Angle of Twist (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v359..v361 (the mechanics-of-materials-2 trio -- the stress
> cases the beam tiles never cover: shaft torsion (this spec), restrained thermal stress (v360), and thin-wall hoop stress
> (v361).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `driveshaft-crit` finds a shaft's critical whirl
> speed, but nothing computes the torsional shear stress a shaft carries under a torque, or the angle it twists -- the check
> that sizes a drive shaft, an auger, a torsion bar, or a bolt in torsion. Adds one tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v358.md.
>
> **The gap, and the evidence for it.** For a solid round shaft the maximum torsional shear stress is `tau = 16 T/(pi d^3)`
> (`= T r/J`, with `J = pi d^4/32`), and the angle of twist over a length `L` is `theta = T L/(J G)` (`G` the shear
> modulus, ~11.5e6 psi for steel). For a 1.5 in shaft carrying 12,000 lb-in (1,000 lb-ft) of torque over 24 in,
> `J = pi x 1.5^4/32 = 0.497 in^4`, `tau = 16 x 12,000/(pi x 1.5^3) = 18,100 psi`, and `theta = 12,000 x 24/(0.497 x 11.5e6) = 0.050 rad = 2.9 deg`
> -- the stress to compare against the allowable shear and the twist to compare against a rigidity limit (often ~1 deg per
> foot). The `d^3` in the stress and `d^4` in the twist are why a small diameter increase stiffens a shaft so fast. The
> critical-speed tile spins the shaft; this tile twists it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The torque `T` is a moment
(lb-in); the diameter `d`, inner diameter `di` (hollow), and length `L` are lengths (in); the shear modulus `G` is a stress
(psi); the polar moment `J` is a length^4 (in^4); the shear stress `tau` is a stress (psi); the angle of twist is an angle
(rad and deg). The v18/v21 contract: any non-finite input, or a diameter, length, or `G` at or below zero, returns
`{ error }`; a hollow shaft uses `J = pi(d^4 - di^4)/32`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
torsion formulas by name; `editionNote` names **the torsional shear `tau = T r/J = 16 T/(pi d^3)` (solid), the polar moment
`J = pi d^4/32` (solid) / `pi(d^4 - di^4)/32` (hollow), the twist `theta = T L/(J G)`, and `G ~ 11.5e6 psi` steel, from the
standard mechanics-of-materials references**, and states that **this returns the elastic torsional shear stress and angle of
twist of a circular shaft -- it is the round-section St. Venant torsion (a non-circular section warps and uses a different
constant), assumes elastic behavior and a uniform torque, and does not check combined torsion-plus-bending, a keyway stress
concentration, or fatigue; and this is a design aid, not a substitute for the engineer of record** -- the shaft
manufacturer's and the engineer of record's design govern.

## 2. The tile

### 2.1 `shaft-torsion` -- Shaft Torsional Shear Stress and Angle of Twist

```
inputs:
  T_lbin    lb-in   applied torque
  d_in      in      shaft outer diameter
  di_in     in      inner diameter (0 for solid)
  L_in      in      length over which twist is measured
  G_psi     psi     shear modulus (11.5e6 steel, 3.9e6 aluminum)

J = pi*(d_in^4 - di_in^4)/32                      ; polar moment, in^4
tau = T_lbin * (d_in/2) / J                        ; max shear stress, psi (= 16T/(pi d^3) solid)
theta_rad = T_lbin * L_in / (J * G_psi)            ; angle of twist, rad
theta_deg = theta_rad * 180/pi
```

**Pinned worked example (a 1.5 in solid steel shaft, 1,000 lb-ft torque, 24 in).** `T = 12,000 lb-in`, `d = 1.5`,
`L = 24`, `G = 11.5e6`: `J = pi x 1.5^4/32 = 0.497 in^4`; `tau = 12,000 x 0.75/0.497 = 18,100 psi`;
`theta = 12,000 x 24/(0.497 x 11.5e6) = 0.050 rad = 2.9 deg`. **Cross-check (bump the diameter to 2 in).**
`J = pi x 2^4/32 = 1.571 in^4`; `tau = 12,000 x 1.0/1.571 = 7,640 psi` (down 58%); `theta = 12,000 x 24/(1.571 x 11.5e6) = 0.016 rad = 0.91 deg`
(down 68%) -- a one-third diameter increase more than halves the stress and cuts the twist to a third, the `d^3`/`d^4`
leverage. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["mechanic","machinist","construction"]`, matching `driveshaft-crit`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the torsion formulas, `editionNote` naming
`tau = 16 T/(pi d^3)`, `J = pi d^4/32`, `theta = T L/(J G)`, and the circular-section, elastic, not-combined caveats);
`test/fixtures/worked-examples.json` (the 1.5 in example + the 2 in cross-check); `test/fixtures/compute-map.js`
(`shaft-torsion` -> `computeShaftTorsion` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`driveshaft-crit` / `section-properties` / `motor-shaft-torque` / `hp-from-torque`); `data/search/aliases.json` ("shaft
torsion", "torsional shear stress", "angle of twist", "shaft torque stress", "polar moment of inertia", "Tr over J",
"torsion bar", "twist calculator", "shaft stress"); the id appended to the existing construction renderers block in
`app.js`; the `// dims:` annotation (`T` moment, lengths length, `G`/`tau` stress, `J` length^4, angle angle); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the solid/hollow `J`, the `d^3`/`d^4`
scaling, and the non-positive / non-finite error seams. No new module; re-pin `calc-construction.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the diameter-scaling assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `J` / `tau` / `theta` stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (1.5 in, 12,000 lb-in -> 18,100 psi, 2.9 deg).

## 5. Roadmap position

Opens the mechanics-of-materials-2 batch (v359..v361) in `calc-construction.js`, adding torsion to the bending/axial
tiles. Restrained thermal stress (v360) and thin-wall hoop stress (v361) follow. A hollow-shaft weight-savings comparison,
a combined torsion-plus-bending (von Mises) stress, and a keyway/fillet stress-concentration factor are the deliberate next
follow-ons once the trio lands.
