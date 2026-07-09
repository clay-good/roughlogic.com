# roughlogic.com Specification v491 -- Rebar Compression Development Length (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the concrete design bench); no new module, group, or dependency. Inherits spec.md through spec-v490.md.
>
> **The gap, and the evidence for it.** The bench has `rc-development-length` (tension straight bars) and
> `rc-hook-development` (hooks), but nothing for bars in compression -- the dowels out of a footing into a column, the
> lap splices in a compression member, the bars in a bearing wall. ACI 318-19 §25.4.9 governs it with a different
> equation and a different floor, and the practical catch is that compression development is **shorter** than tension:
> the bar end bears on the concrete, so there is no flexural-cracking penalty. A detailer who reuses the tension length
> for compression dowels buys bar that was never needed. There is a second catch the tile makes visible: at high `f'c`
> the `sqrt(f'c)` term keeps shrinking, so the `0.0003 fy db` lower bound takes over and the length stops falling. The
> tile computes both governing terms, applies the 8 in absolute minimum, and honors the `ψr = 0.75` reduction when
> confining ties or a spiral are present -- the number that tells a detailer how deep the dowels really need to go.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bar diameter and the
development length are lengths (`L`); `fy` and `f'c` are stresses (`M L^-1 T^-2`); the lightweight factor `λ` and the
confinement factor `ψr` are `dimensionless`. Note the two governing terms are dimensionally inhomogeneous as written in
the code (ACI mixes a `sqrt(psi)` term and a bare-`fy` term against a `db` in inches with unit-bearing constants `50`
and `0.0003`), so the `// dims:` annotation carries the constants as `dimensionless` and pins the output as `L`, the
established convention for ACI empirical length equations already in the bench. The v18/v21 contract: any non-finite
input, a non-positive bar diameter, `fy`, or `f'c`, a `λ` outside `(0, 1]`, or a `ψr` outside `[0.75, 1.0]` returns
`{ error }`. Citation discipline (v19/v22): `ACI` over §25.4.9; `editionNote` names **ACI 318-19 §25.4.9.2 (compression
development length)**, prints `ldc = max( (fy x psi_r) / (50 x lambda x sqrt(f'c)) x db , 0.0003 x fy x psi_r x db ,
8 in )`, and states that **compression development is shorter than tension because the bar end bears on concrete, the
`0.0003 fy` term governs at high `f'c`, `psi_r = 0.75` applies only where §25.4.9.3 confining reinforcement (ties or a
spiral of the stated size and spacing) wraps the developed bar, `λ = 0.75` for lightweight concrete, and lap-splice and
minimum-length provisions still apply** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `rc-compression-dev-length` -- How Deep Compression Dowels Really Go (Shorter Than Tension)

```
inputs:
  bar_diameter_in   in    db, the developed bar diameter (e.g. #8 = 1.0 in)
  fy_psi            psi    reinforcement yield strength (default 60000)
  fc_psi            psi    concrete compressive strength f'c
  lambda            -      lightweight factor (1.0 normalweight, 0.75 lightweight)
  psi_r             -      confinement factor (0.75 with ties/spiral per 25.4.9.3, else 1.0)

term1 = (fy x psi_r) / (50 x lambda x sqrt(fc)) x db      [in]
term2 = 0.0003 x fy x psi_r x db                          [in]
ldc   = max(term1, term2, 8.0)                            [in]
governing = which term set ldc
```

**Pinned worked example (a #8 dowel, Grade 60, 4000 psi, normalweight, no confining ties).** `db = 1.0`,
`term1 = (60000 x 1.0) / (50 x 1.0 x sqrt(4000)) x 1.0 = 60000 / 3162.3 = ` **18.97 in**;
`term2 = 0.0003 x 60000 x 1.0 x 1.0 = ` **18.0 in**; `ldc = max(18.97, 18.0, 8) = ` **19.0 in** (term1 governs). That is
well under the tension development length the same bar would need, the whole point of the compression rule.
**Cross-check (high-strength concrete stops the length from falling).** Raise `f'c` to `8000 psi`:
`term1 = 60000 / (50 x sqrt(8000)) = 60000 / 4472 = 13.42 in`, but `term2` is still **18.0 in**, so `ldc = 18.0 in` --
the `0.0003 fy db` floor now governs, and doubling the concrete strength did not shorten the dowel. The tile returns
both terms, the governing one, and the final length; with confining ties (`psi_r = 0.75`) at 4000 psi it drops to
`14.2 in`.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`ACI`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 4000 psi example + the
8000 psi floor-governs cross-check); `test/fixtures/compute-map.js`
(`rc-compression-dev-length` -> `computeRcCompressionDevLength` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-development-length` / `rc-hook-development` / `rc-column-axial`);
`data/search/aliases.json` ("compression development length", "ldc", "compression lap splice", "dowel embedment",
"rebar compression", "aci 25.4.9", "column dowels", "compression splice length"); the id appended to the concrete
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the 8 in minimum (ldc never below 8), the term2-governs-at-high-f'c
crossover, the psi_r scaling, and the error seams (non-finite, non-positive db/fy/f'c, lambda out of range, psi_r out of
range). Hand-writes its renderer (mirroring the calc-concrete.js `rc-development-length` pattern). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the two-term / max stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the #8 / 4000 psi example -> 19.0 in).

## 5. Roadmap position

Completes the development-length family beside `rc-development-length` (tension) and `rc-hook-development` (hooks): this
is the compression case, and it makes the "compression is shorter" and "high f'c hits a floor" catches explicit. A
compression lap-splice length (the 0.0005 fy db / longer-of rule for splices) and a bundled-bar factor are deliberate
future follow-ons. Further Group E growth stays evidence-driven.
