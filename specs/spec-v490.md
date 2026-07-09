# roughlogic.com Specification v490 -- Concrete Bearing Strength (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the concrete design bench); no new module, group, or dependency. Inherits spec.md through spec-v489.md.
>
> **The gap, and the evidence for it.** The concrete bench sizes beams, columns, footings, and development lengths, but
> nothing checks the simplest and most-forgotten limit state where two concrete elements bear on each other: a precast
> column landing on a footing, a beam seat on a corbel, a base plate grouted on a pier. ACI 318-19 §22.8 governs it, and
> it has a catch that trips even careful designers. The bearing strength is not just `0.85 f'c` times the loaded area --
> when the supporting surface is wider than the loaded patch, the surrounding concrete confines it and the allowable
> pressure is multiplied by `sqrt(A2/A1)`, up to a hard cap of `2.0`. A column bearing on a large spread footing earns
> the full 2x bonus; a pad bearing flush to the edge of its support (`A2 = A1`) earns none. Everyone remembers the
> `0.85 f'c` and either forgets the confinement bonus (over-conservative, oversized bearing area) or over-claims it past
> the 2x ceiling (unconservative). The tile computes the bearing strength both ways, applies the cap, and reports the
> demand-capacity ratio so the check is explicit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The loaded and supporting
areas are areas (`L^2`); `f'c` is a stress (`M L^-1 T^-2`); the factored load and the bearing strength are forces
(`M L T^-2`); the area ratio, its square root, and the demand-capacity ratio are `dimensionless`. The v18/v21 contract:
any non-finite input, a non-positive loaded area, a supporting area smaller than the loaded area (`A2 < A1` is
geometrically impossible for a bearing patch inside its support), a non-positive `f'c`, or a negative factored load
returns `{ error }`. Citation discipline (v19/v22): `ACI` over §22.8; `editionNote` names **ACI 318-19 §22.8.3
(bearing strength)**, prints `sqrt_ratio = min(sqrt(A2 / A1), 2.0)`, `Bn = 0.85 x f'c x A1 x sqrt_ratio`,
`phiBn = 0.65 x Bn`, and `DCR = Pu / phiBn`, and states that **the confinement bonus applies only when the supporting
surface is wider than the loaded area on all sides and slopes/steps meet §22.8.3.2, the sqrt(A2/A1) factor is capped at
2.0, phi = 0.65 for bearing (§21.2), and a required bearing area exceeding the member may need a bearing plate or
confinement reinforcement** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `concrete-bearing-strength` -- The Confinement Bonus a Concrete Bearing Check Forgets

```
inputs:
  loaded_area_in2      in^2   A1, the contact area carrying the load
  support_area_in2     in^2   A2, the geometrically similar area of the supporting surface (>= A1)
  fc_psi               psi    concrete specified compressive strength f'c of the supporting member
  factored_load_kip    kip    Pu, the factored bearing load (0 = capacity only)

sqrt_ratio = min( sqrt(support_area / loaded_area), 2.0 )              [-]   capped confinement bonus
Bn_lb      = 0.85 x fc x loaded_area x sqrt_ratio                      [lb]  nominal bearing strength
phiBn_kip  = 0.65 x Bn / 1000                                          [kip] design bearing strength
DCR        = factored_load > 0 ? factored_load / phiBn_kip : null      [-]   demand / capacity
```

**Pinned worked example (a 12x12 in column on a large footing, 4000 psi).** The loaded area is
`12 x 12 = 144 in^2`; the footing offers a similar area of `36 x 36 = 1296 in^2`, so
`sqrt(1296 / 144) = sqrt(9) = 3.0`, capped to **2.0** -- the confinement bonus is at its ceiling. The nominal strength
is `0.85 x 4000 x 144 x 2.0 = 979,200 lb`, and `phiBn = 0.65 x 979,200 / 1000 = ` **636.5 kip**. A `500 kip` factored
load gives `DCR = 500 / 636.5 = ` **0.79** -- it passes with room. **Cross-check (a pad flush to the edge earns no
bonus).** Take the same `144 in^2` patch bearing on a support only `144 in^2` (`A2 = A1`): `sqrt(1) = 1.0`, so
`phiBn = 0.65 x 0.85 x 4000 x 144 / 1000 = ` **318.2 kip** -- exactly half, and the same `500 kip` load now fails at
`DCR = 1.57`. The confinement geometry, not the concrete strength, is what changed. The tile returns the capped square-
root factor, the nominal and design bearing strengths, and the demand-capacity ratio.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`ACI`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the confined-column example +
the flush-pad cross-check); `test/fixtures/compute-map.js`
(`concrete-bearing-strength` -> `computeConcreteBearingStrength` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-column-axial` / `column-base-plate` / `footing-eccentric-pressure`);
`data/search/aliases.json` ("concrete bearing", "bearing strength", "aci 318 22.8", "confinement bonus", "a2/a1",
"column on footing", "base plate bearing", "bearing capacity concrete"); the id appended to the concrete renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the 2.0 cap (sqrt_ratio never exceeds 2), the exact half-capacity relation between the two
examples, and the error seams (non-finite, non-positive loaded area, A2 < A1, non-positive f'c, negative load). Hand-
writes its renderer (mirroring the calc-concrete.js `rc-column-axial` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the area-ratio / strength / DCR stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the confined-column example -> 636.5 kip, DCR 0.79).

## 5. Roadmap position

Fills the concrete-on-concrete bearing limit state that sits between `rc-column-axial` (the member) and
`column-base-plate` (the steel-to-concrete interface) and `footing-eccentric-pressure` (the soil below). A companion
bearing-plate-thickness design (cantilever bending of the plate off the loaded patch) and a confinement-reinforcement
check where the required area exceeds the member are deliberate future follow-ons. Further Group E growth stays
evidence-driven.
