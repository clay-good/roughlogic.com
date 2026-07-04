# roughlogic.com Specification v379 -- Concrete Modulus of Rupture fr (ACI 318-19 19.2.3) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the concrete-material-properties trio (v378 Ec -> v379 modulus of
> rupture -> v380 shrinkage/temperature steel). The catalog has flexural strength (`rc-beam-flexure`) but not the tensile
> stress at which plain concrete first cracks -- the modulus of rupture that sets the cracking moment behind every
> deflection and minimum-reinforcement check.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Concrete cracks in flexure when the extreme-fiber
> tensile stress reaches the modulus of rupture `fr = 7.5 * lambda * sqrt(f'c)` psi (ACI 318-19 §19.2.3.1), where `lambda`
> is the lightweight-concrete modification factor (`1.0` normalweight, `0.75` all-lightweight). This is the stress a slab
> deflection calculation compares against to decide whether the gross or the cracked section governs, and it pairs directly
> with `Ec` (v378) in the cracking-moment `Mcr = fr * Ig / yt`. This adds the rupture-modulus tile to the existing
> **`calc-concrete.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v378.md.
>
> **The gap, and the evidence for it.** For `4000 psi` normalweight concrete, `fr = 7.5 * 1.0 * sqrt(4000) = 474` psi -- the
> familiar cracking stress about `12%` of `f'c`. Drop to `3000 psi` and `fr = 7.5 * 1.0 * sqrt(3000) = 411` psi; switch to
> all-lightweight at `4000 psi` and `lambda = 0.75` cuts it to `356` psi, which is exactly why a lightweight slab cracks and
> deflects sooner. No tile returns `fr`; `rc-slab-min-thickness` uses span/depth tables to *avoid* a deflection calculation
> precisely because the cracking stress was never available.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified compressive
strength `f'c` is a pressure (psi); the lightweight factor `lambda` is dimensionless; the modulus of rupture `fr` is a
pressure (psi). The v18/v21 contract: any non-finite input, or a non-positive `f'c`, returns `{ error }`; `lambda` is
constrained to the code range `0.75 to 1.0` (values outside it are flagged while still computing), and the tile also
reports `fr` as a fraction of `f'c` for the sanity read. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI
modulus of rupture by name; `editionNote` names **ACI 318-19 §19.2.3.1, the relation `fr = 7.5 * lambda * sqrt(f'c)` psi,
`lambda` the §19.2.4 lightweight modification factor (`1.0` normalweight, `0.75` all-lightweight, `0.85` sand-lightweight),
and `fr` as the flexural tensile cracking stress used in the cracking moment `Mcr = fr*Ig/yt`**, and states that **this
returns the plain-concrete rupture modulus for cracking-moment and deflection work, that it is the code value (measured
rupture varies and can be tested per ASTM C78), and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `concrete-modulus-of-rupture` -- Concrete Modulus of Rupture fr (ACI 318-19)

```
inputs:
  fc_psi   psi   specified compressive strength f'c
  lambda   -     lightweight modification factor (1.0 normalweight, 0.75 all-lightweight)

fr_psi      = 7.5 * lambda * sqrt(fc_psi)     psi   (ACI 19.2.3.1)
fr_fraction = fr_psi / fc_psi                 [-]
```

**Pinned worked example (4000 psi normalweight, lambda = 1.0).** `fr = 7.5 * 1.0 * sqrt(4000) = 474` psi,
about `0.119 * f'c`. **Cross-check (all-lightweight, lambda = 0.75).** Same `4000 psi` at `lambda = 0.75`:
`fr = 7.5 * 0.75 * sqrt(4000) = 356` psi -- the lightweight cracking penalty. And `3000 psi` normalweight gives
`fr = 411` psi. A `lambda` outside `0.75 to 1.0` is flagged while still returning the number. The non-finite and
non-positive-`f'c` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside `concrete-elastic-modulus` / the `rc-*` tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §19.2.3.1, `editionNote` naming
`fr = 7.5*lambda*sqrt(f'c)`, the `lambda` factors, and the cracking-moment use); `test/fixtures/worked-examples.json` (the
normalweight example + the lightweight cross-check + the 3000 psi point); `test/fixtures/compute-map.js`
(`concrete-modulus-of-rupture` -> `computeConcreteModulusOfRupture` in `../../calc-concrete.js`); `scripts/related-tiles.mjs`
(-> `concrete-elastic-modulus` / `rc-slab-min-thickness` / `rc-beam-flexure` / `rc-development-length`);
`data/search/aliases.json` ("modulus of rupture", "concrete rupture modulus", "cracking stress concrete", "fr concrete",
"7.5 sqrt fc", "flexural tensile strength concrete", "cracking moment", "concrete flexural cracking", "aci 19.2.3"); the id
appended to the existing concrete renderers block in `app.js`; the `// dims:` annotation (f'c pressure, lambda
dimensionless, fr pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
lambda-out-of-range flag, and the non-positive / non-finite error seams. No new module; re-pin `calc-concrete.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `fr` / fraction pair wraps on a phone); render-no-nan +
a11y sweep, output read to the value (4000 psi, lambda 1.0 -> 474 psi).

## 5. Roadmap position

The tensile cracking stress that pairs with `Ec` (v378): together they give the cracking moment `Mcr = fr*Ig/yt` and set up
an ACI 318 §24.2 effective-moment-of-inertia deflection tile as the deliberate next follow-on.
`concrete-shrinkage-temperature-steel` (v380) closes the trio with the minimum reinforcement those slabs still require.
