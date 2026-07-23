# roughlogic.com Specification v1008 -- One-Way Concrete Shear Without Stirrups (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1007.md. Beside `rc-beam-shear` and
> `rc-punching-shear` in the ACI 318-19 shear family.
>
> **The gap, and the evidence for it.** The catalog covers *two-way* punching shear (`rc-punching-shear`, which already
> carries the 2019 size-effect factor) and the *stirrup-designed* simplified one-way case (`rc-beam-shear`, whose
> citation states outright that it "uses the simplified Vc, not the detailed expression with the reinforcement-ratio and
> size-effect terms"). Nothing computed the **detailed ACI 318-19 Table 22.5.5.1(b) one-way shear for a member without
> at least minimum shear reinforcement** -- the headline change of the 2019 edition and the everyday governing check for
> footings and one-way slabs, which have no stirrups. An alias-index + `tools-data` + compute-map sweep confirmed no
> one-way / footing-shear tile exists (the catalog's 15 `*shear*` ids are all other limit states). The number this
> settles: a 12 in strip at d = 16 in with As = 1.0 in^2 carries **11.1 kip** design shear, **not** the 18.2 kip the old
> 2 sqrt(f'c) rule implied.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute; psi, in, in^2 in, a stress and a kip out),
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive f'c, bw,
d, or As, or a lambda outside (0, 1.0] returns `{ error }`; a zero `vu_kip` returns a null adequacy verdict rather than
a false one. Citation discipline (v19/v22): ACI 318-19 Table 22.5.5.1(b), the 22.5.5.1.3 size-effect factor, and the
22.5.3.1 sqrt(f'c) cap by name, `GOVERNANCE.general`; the note explains that the expression applies only when the
member lacks Av,min, that lambda_s is 1.0 up to d = 10 in, and that the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `rc-one-way-shear` -- One-Way Concrete Shear Without Stirrups (ACI 318-19 22.5.5.1)

```
inputs:
  fc_psi     concrete strength f'c (psi), default 4000
  bw_in      section width bw (in)
  d_in       effective depth d (in)
  as_in2     longitudinal tension steel As (in^2)
  vu_kip     factored shear Vu (kip, 0 = capacity only), default 0
  lambda     lightweight factor, default 1.0

rho_w              = as_in2 / (bw_in x d_in)
lambda_s           = min(sqrt(2 / (1 + d_in/10)), 1.0)          [22.5.5.1.3]
sqrt_fc            = min(sqrt(fc_psi), 100)                     [22.5.3.1]
vc_psi             = 8 x lambda_s x lambda x cbrt(rho_w) x sqrt_fc
vc_kip             = vc_psi x bw_in x d_in / 1000
phi_vc_kip         = 0.75 x vc_kip                              [21.2.1]
vc_simplified_kip  = 2 x lambda x sqrt_fc x bw_in x d_in / 1000 [comparison only]
adequate           = vu_kip > 0 ? vu_kip <= phi_vc_kip : null
```

**Pinned worked example.** f'c = 4,000 psi, bw = 12 in, d = 16 in, As = 1.0 in^2: `rho_w = 1.0/(12 x 16) = 0.005208`;
`lambda_s = sqrt(2/2.6) = 0.8771`; `vc = 8 x 0.8771 x 0.17335 x 63.246 = ` **76.92 psi**; `Vc = 14.77 kip`;
`phi Vc = ` **11.08 kip**. The simplified `2 sqrt(f'c) bw d = 24.29 kip` is shown beside it: the deep, lightly
reinforced section is penalized about 39% by the size-effect and (rho_w)^(1/3) terms, which is the whole point of the
2019 change. Cross-check at the size-effect boundary: the same strip at d = 10 in gives `lambda_s = 1.0` exactly,
`vc = ` **102.58 psi**, `phi Vc = ` **9.232 kip**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `rc-punching-shear`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (ACI 318-19 Table 22.5.5.1(b) + 22.5.5.1.3 + 22.5.3.1, `GOVERNANCE.general`,
three assumptions); `test/fixtures/worked-examples.json` (the pinned example plus the lambda_s = 1.0 boundary
cross-check, pinning `lambda_s`, `vc_psi`, and `phi_vc_kip`); `test/fixtures/compute-map.js` (`rc-one-way-shear` ->
`computeRcOneWayShear`, module `../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-beam-shear` /
`rc-punching-shear` / `footing-area`); `data/search/aliases.json` (8 collision-checked search aliases plus 6
question-corpus phrases), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer`
factory in the `CONCRETE_RENDERERS` map, and the id added to the calc-concrete declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings. The calc-concrete.js
gzip cap and the Group E group shell are watched at build. Home tile count 1,456 -> 1,457.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures); `npm run build`; `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build; worked-examples runner; render + output read
to the value (12 in strip, d 16 in, As 1.0 in^2 -> 11.1 kip design shear).

## 5. Roadmap position

Completes the ACI 318-19 shear family: two-way punching (`rc-punching-shear`), stirrup-designed one-way
(`rc-beam-shear`), and now the no-stirrup detailed one-way case that governs footings and slabs. Serves the
concrete/foundation contractor and the plan reviewer (construction, carpentry). Deliberately the capacity check; the
member's axial load, the (a)-branch expressions for stirrup-reinforced members, minimum shear reinforcement triggers,
and deep-beam action stay separate. Stays evidence-driven -- this tile came from re-deriving an existing tile's
citation, not from a discovery sweep, which is the vein the catalog still has open.
