# roughlogic.com Specification v360 -- Restrained Thermal Stress and Force (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v359..v361 (the mechanics-of-materials-2 trio -- shaft torsion
> (v359), restrained thermal stress (this spec), thin-wall hoop stress (v361)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pipe-expansion` gives the length a material grows
> when heated, but if that growth is restrained -- a fixed-end pipe, a rail, a welded steel member -- the material develops
> a large internal stress instead, `sigma = E alpha dT`, independent of length. That restrained-thermal-stress check, the
> reason expansion joints and loops exist, has no tile. Adds one tile to the existing **`calc-construction.js`** module
> (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v359.md.
>
> **The gap, and the evidence for it.** A free member heated by `dT` grows `delta = alpha L dT`; a fully restrained member
> cannot, so it carries the stress that would have produced that strain: `sigma = E alpha dT` (compression on heating,
> tension on cooling), and the force is `F = sigma x A`. The stress does not depend on length -- a 1 ft and a 100 ft
> restrained bar of the same section develop the same stress. For structural steel (`E = 29e6 psi`, `alpha = 6.5e-6/degF`)
> heated 100 degF, `sigma = 29e6 x 6.5e-6 x 100 = 18,850 psi` of compression -- more than half the yield of mild steel, from
> a modest temperature swing, and the reason a fixed-fixed steel member or a continuously welded rail buckles or cracks
> without an expansion provision. `pipe-expansion` sizes the movement; this tile sizes the stress when the movement is
> blocked.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The modulus `E` and the
resulting stress are stresses (psi); the coefficient of thermal expansion `alpha` is per-degF; the temperature change `dT`
is a temperature (degF); the area `A` is an area (in^2); the restraint force is a force (lb); the free expansion (for
comparison) is a length (in). The v18/v21 contract: any non-finite input, or a modulus or area at or below zero, returns
`{ error }`; a partial-restraint factor (0 to 1) scales the stress. Citation discipline (v19/v22): `GOVERNANCE.general`
over the thermal-stress relation by name; `editionNote` names **the restrained thermal stress `sigma = E alpha dT` (fully
restrained, length-independent), the free expansion `delta = alpha L dT`, the restraint force `F = sigma A`, and typical
coefficients (`6.5e-6/degF` steel, `13e-6` aluminum, `5.5e-6` concrete, `9.9e-6` copper), from the standard references**,
and states that **this returns the stress and force in a restrained member under a temperature change -- it is the fully-
restrained membrane stress (a partly-restrained member develops proportionally less; enter a restraint factor), does not
buckle-check the member (a compressive thermal stress can trigger buckling before yield, `column-buckling-wood`/
`steel-column-capacity`) or add the pressure/mechanical stress, and does not size an expansion joint (`pipe-expansion-loop`);
and this is a design aid, not a substitute for the engineer of record** -- the structural engineer of record's design
governs.

## 2. The tile

### 2.1 `thermal-stress-restrained` -- Restrained Thermal Stress and Force

```
inputs:
  E_psi     psi      modulus of elasticity
  alpha     /degF    coefficient of thermal expansion
  dT_F      degF     temperature change (+ heating)
  A_in2     in^2     cross-sectional area (for force)
  L_in      in       length (for free-expansion comparison)
  restraint -        restraint factor 0..1 (default 1, fully restrained)

sigma = E_psi * alpha * dT_F * restraint           ; restrained thermal stress, psi
F = sigma * A_in2                                   ; restraint force, lb
free_delta = alpha * L_in * dT_F                    ; unrestrained expansion, in
```

**Pinned worked example (structural steel, 100 degF rise, fully restrained, A = 5 in^2).** `E = 29e6`, `alpha = 6.5e-6`,
`dT = 100`: `sigma = 29e6 x 6.5e-6 x 100 = 18,850 psi` (compression); `F = 18,850 x 5 = 94,250 lb`. The free expansion of a
20 ft member would have been `6.5e-6 x 240 x 100 = 0.156 in` -- that blocked movement becomes the 18,850 psi stress.
**Cross-check (aluminum, same rise).** `alpha = 13e-6`, `E = 10e6`: `sigma = 10e6 x 13e-6 x 100 = 13,000 psi` -- aluminum's
double expansion coefficient but third-lower modulus nets a lower thermal stress than steel, the material trade behind a
thermal design. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry","pipefitting"]`, matching the mechanics tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the thermal-stress relation, `editionNote`
naming `sigma = E alpha dT`, the free expansion, the restraint force, the coefficients, and the fully-restrained,
not-buckling, not-expansion-joint caveats); `test/fixtures/worked-examples.json` (the steel example + the aluminum cross-
check); `test/fixtures/compute-map.js` (`thermal-stress-restrained` -> `computeThermalStressRestrained` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `pipe-expansion` / `pipe-expansion-loop` /
`thermal-expansion-volume` / `conduit-thermal-expansion`); `data/search/aliases.json` ("thermal stress", "restrained
thermal stress", "E alpha delta T", "fixed pipe thermal stress", "thermal expansion stress", "rail thermal stress",
"restrained expansion", "temperature stress", "thermal force"); the id appended to the existing construction renderers
block in `app.js`; the `// dims:` annotation (`E`/`sigma` stress, `alpha` per-temperature, `dT` temperature, `A` area, `F`
force, `L`/`delta` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
length-independence of stress, the restraint factor, the force, and the non-positive / non-finite error seams. No new
module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the length-independence assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `sigma` / `F` / `free_delta` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (steel, 100 degF -> 18,850 psi).

## 5. Roadmap position

Middle of the mechanics-of-materials-2 batch (v359..v361) in `calc-construction.js`, adding the restrained-thermal case to
the torsion tile. Thin-wall hoop stress (v361) follows. A thermal-buckling check chaining the compressive stress into a
column-buckling tile, a partly-restrained (spring-supported) stiffness model, and a combined thermal-plus-pressure stress
are the deliberate next follow-ons once the trio lands.
