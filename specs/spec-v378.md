# roughlogic.com Specification v378 -- Concrete Modulus of Elasticity Ec (ACI 318-19 19.2.2) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.133.0; proposed 2026-07-03). First tile of a concrete-material-properties trio (v378 Ec -> v379 modulus of rupture
> -> v380 shrinkage/temperature steel). The catalog has the ACI 318 member checks (`rc-beam-flexure`, `rc-beam-shear`,
> `rc-column-axial`, `rc-slab-min-thickness`, ...) but not the elastic modulus every deflection, drift, and short-column
> stiffness calculation depends on.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Deflection, effective-stiffness, modular-ratio, and
> lateral-drift checks all start from `Ec`, the concrete modulus of elasticity, and none of the reinforced-concrete tiles
> return it. ACI 318-19 §19.2.2.1 gives `Ec = wc^1.5 * 33 * sqrt(f'c)` psi for normalweight and structural lightweight
> concrete in the `90 to 160 pcf` unit-weight range, with the familiar normalweight shortcut `Ec = 57000 * sqrt(f'c)`. This
> adds the modulus tile to the existing **`calc-concrete.js`** module (Group E); no new group, trade, or dependency.
> Inherits spec.md through spec-v377.md.
>
> **The gap, and the evidence for it.** For `4000 psi` normalweight concrete at `wc = 145 pcf`,
> `Ec = 145^1.5 * 33 * sqrt(4000) = 1746.0 * 33 * 63.25 = 3,644,000` psi, about `3644 ksi`; the normalweight shortcut
> `57000 * sqrt(4000) = 3,605,000` psi confirms it to within 1%. Structural lightweight at `wc = 115 pcf` drops the modulus
> to `Ec = 115^1.5 * 33 * sqrt(4000) = 2,573,000` psi -- roughly 70% of normalweight, which is exactly why a lightweight
> deck deflects more. No tile computes this; `rc-slab-min-thickness` sidesteps deflection with span/depth tables precisely
> because `Ec` was never available.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified compressive
strength `f'c` is a pressure (psi); the unit weight `wc` is a density (pcf); the modulus `Ec` is a pressure (psi). The
v18/v21 contract: any non-finite input, or a non-positive `f'c` or `wc`, returns `{ error }`; the tile flags a unit weight
outside the `90 to 160 pcf` validity band of Eq. 19.2.2.1(a) (the empirical fit is not calibrated beyond it) while still
returning the computed value, and reports both the general `wc^1.5` result and the `57000*sqrt(f'c)` normalweight shortcut.
Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI concrete modulus by name; `editionNote` names **ACI 318-19
§19.2.2.1, the modulus `Ec = wc^1.5 * 33 * sqrt(f'c)` psi for `wc` in `90 to 160 pcf`, the normalweight shortcut
`Ec = 57000 * sqrt(f'c)`, and `f'c` as the specified compressive strength**, and states that **this returns the concrete
static modulus of elasticity used in deflection, drift, and modular-ratio work, that it is the code empirical value (actual
modulus varies with aggregate and can be tested per ASTM C469), and that it is a design aid, not a substitute for the
engineer of record or a measured modulus**.

## 2. The tile

### 2.1 `concrete-elastic-modulus` -- Concrete Modulus of Elasticity Ec (ACI 318-19)

```
inputs:
  fc_psi   psi   specified compressive strength f'c
  wc_pcf   pcf   concrete unit weight (default 145 for normalweight)

ec_psi        = wc_pcf^1.5 * 33 * sqrt(fc_psi)     psi   (ACI 19.2.2.1(a), 90 <= wc <= 160)
ec_normal_psi = 57000 * sqrt(fc_psi)               psi   (normalweight shortcut)
```

**Pinned worked example (4000 psi, 145 pcf normalweight).** `Ec = 145^1.5 * 33 * sqrt(4000) = 1746.0 * 33 * 63.25
= 3,644,000` psi = `3644 ksi`; the shortcut `57000 * sqrt(4000) = 3,605,000` psi agrees within 1%. **Cross-check
(lightweight, 115 pcf).** `Ec = 115^1.5 * 33 * sqrt(4000) = 2,573,000` psi -- about 70% of normalweight, the stiffness
penalty of a lightweight deck. A `wc` below 90 or above 160 pcf is flagged out-of-band while still returning the number.
The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside the `rc-*` tiles); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §19.2.2.1, `editionNote` naming `Ec = wc^1.5*33*sqrt(f'c)`, the
`57000*sqrt(f'c)` shortcut, and the 90-160 pcf band); `test/fixtures/worked-examples.json` (the normalweight example + the
lightweight cross-check); `test/fixtures/compute-map.js` (`concrete-elastic-modulus` -> `computeConcreteElasticModulus` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-slab-min-thickness` / `rc-beam-flexure` /
`concrete-modulus-of-rupture` / `rc-doubly-reinforced`); `data/search/aliases.json` ("concrete elastic modulus", "modulus
of elasticity concrete", "Ec concrete", "57000 sqrt fc", "concrete stiffness", "aci 19.2.2", "concrete youngs modulus",
"ec 33 wc", "concrete modulus"); the id appended to the existing concrete renderers block in `app.js`; the `// dims:`
annotation (f'c pressure, wc density, Ec pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the out-of-band flag, and the non-positive / non-finite error seams. No new module; re-pin
`calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the two-modulus output wraps on a phone); render-no-nan + a11y
sweep, output read to the value (4000 psi / 145 pcf -> 3,644,000 psi).

## 5. Roadmap position

The stiffness property that opens the concrete-properties trio: `concrete-modulus-of-rupture` (v379) gives the tensile
cracking stress that pairs with `Ec` in a cracking-moment and deflection check, and `concrete-shrinkage-temperature-steel`
(v380) covers the minimum reinforcement those slabs still need. An ACI 318 immediate-deflection tile (`Ie` effective moment
of inertia) that consumes both `Ec` and `fr` is the deliberate next follow-on.
