# roughlogic.com Specification v556 -- Concrete Corbel / Bracket Design (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the concrete design bench); no new module, group, or dependency. Inherits spec.md through spec-v555.md.
>
> **The gap, and the evidence for it.** `rc-shear-friction` gives the bare interface shear-friction steel, but a corbel
> or bracket -- the short cantilever that carries a beam seat off a column -- needs more than that, and ACI 318-19
> Section 16.5 governs it. The bench has no corbel tile. Two catches make it its own design. First, the code mandates a
> **horizontal tensile force** `Nuc` of at least `0.2 Vu` (from restrained shrinkage and creep dragging on the bearing),
> which designers who size for the vertical shear alone omit -- and it drives the top steel. Second, the primary tension
> reinforcement is the **greater of two load paths**: the flexure-plus-tension steel `Af + An` and the shear-friction-
> plus-tension steel `2/3 Avf + An`, and which governs flips with the shear span. On top of that, the nominal shear is
> capped (not by the usual `sqrt(f'c)` shear) so a deep, short corbel is limited by `Vn <= min(0.2 f'c, 480 + 0.08 f'c,
> 1600) b d`. The tile takes the factored shear, the horizontal tension, the geometry, and the materials, and returns
> the primary steel, the shear-friction and flexural components, and the shear cap check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The factored shear and
horizontal tension and the shear cap are forces (`M L T^-2`, in lb or kip); the shear span, depth, height, and width are
lengths (`L`, in inches); `f'c` and `fy` are stresses (`M L^-1 T^-2`, in psi); the steel areas are areas (`L^2`, in
in^2); the friction coefficient and resistance factor are `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive shear, depth, width, `f'c`, or `fy`, a shear span `av > d` (outside the corbel range `av/d <= 1`), or a
horizontal tension below `0.2 Vu` (the tile enforces the minimum) returns `{ error }` or clamps `Nuc` to the minimum.
Citation discipline (v19/v22): `ACI` over Section 16.5; `editionNote` names **ACI 318-19 Section 16.5 (brackets and
corbels)**, prints `Avf = Vu / (phi x mu x fy)`, `Mu = Vu x av + Nuc x (h - d)`, `Af = Mu / (phi x fy x 0.85 d)`,
`An = Nuc / (phi x fy)`, `Asc = max(Af + An, (2/3) x Avf + An)`, and the cap
`phiVn = phi x min(0.2 f'c, 480 + 0.08 f'c, 1600) x b x d`, and states that **the horizontal tension Nuc of at least
0.2 Vu is mandatory (restrained shrinkage and creep drag on the bearing) and drives the top steel, the primary steel is
the greater of the flexure-plus-tension and shear-friction-plus-tension paths (which governs flips with the shear span),
the shear is capped by the min-of-three limit not the sqrt(f'c) shear so a deep short corbel is cap-governed, and ACI
318 and the engineer of record govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `concrete-corbel-bracket` -- The Mandatory 0.2Vu Tension and Greater-of-Two Steel a Bare Shear Check Misses

```
inputs:
  factored_shear_lb   lb    Vu
  horiz_tension_lb    lb    Nuc (clamped to >= 0.2 Vu)
  shear_span_av_in    in    av (av/d <= 1)
  eff_depth_d_in      in    d
  height_h_in         in    h
  width_b_in          in    b
  fc_psi              psi   f'c
  fy_psi              psi   fy
  friction_mu         -     shear-friction coefficient (1.4 monolithic normalweight)

Nuc     = max(horiz_tension_lb, 0.2 x factored_shear_lb)
Avf     = factored_shear_lb / (0.75 x friction_mu x fy)                        [in^2]
Mu      = factored_shear_lb x shear_span_av_in + Nuc x (height_h_in - eff_depth_d_in)   [lb-in]
Af      = Mu / (0.75 x fy x 0.85 x eff_depth_d_in)                            [in^2]
An      = Nuc / (0.75 x fy)                                                   [in^2]
Asc     = max(Af + An, (2/3) x Avf + An)                                      [in^2]
phiVn   = 0.75 x min(0.2 x fc, 480 + 0.08 x fc, 1600) x width_b x eff_depth_d [lb]
```

**Pinned worked example (Vu = 40 kip, av = 4 in, d = 12 in, h = 14 in, b = 14 in, f'c 4000, fy 60,000, mu 1.4).** The
mandatory tension is `Nuc = 0.2 x 40 = 8 kip`. `Avf = 40,000 / (0.75 x 1.4 x 60,000) = 0.635 in^2`;
`Mu = 40,000 x 4 + 8,000 x 2 = 176,000 lb-in`, so `Af = 176,000 / (0.75 x 60,000 x 0.85 x 12) = 0.383 in^2` and
`An = 8,000 / 45,000 = 0.178 in^2`. The primary steel is
`Asc = max(0.383 + 0.178, (2/3)(0.635) + 0.178) = max(0.561, 0.601) = ` **0.601 in^2** -- the shear-friction path
governs here. The shear cap is `phiVn = 0.75 x min(800, 800, 1600) x 14 x 12 = ` **100.8 kip**, comfortably above the
40 kip demand. **Cross-check (a deeper bracket flips the governing path).** Push the shear span to `av = 8 in`:
`Mu = 336,000 lb-in`, `Af = 0.732 in^2`, so `Asc = max(0.732 + 0.178, 0.601) = ` **0.910 in^2** -- now the flexure path
governs, and the corbel needs 51% more top steel purely from the longer shear span. The tile returns the primary steel,
its two component paths, and the shear-cap check.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`ACI`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the shear-friction-governs example + the flexure-
governs cross-check); `test/fixtures/compute-map.js` (`concrete-corbel-bracket` -> `computeConcreteCorbelBracket` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-shear-friction` / `rc-beam-shear` /
`concrete-bearing-strength`); `data/search/aliases.json` ("corbel", "bracket design", "aci 16.5", "shear friction
corbel", "corbel steel", "nuc tension corbel", "bearing bracket", "corbel reinforcement"); the id appended to the
concrete renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the 0.2Vu tension clamp, the greater-of-two steel paths, the
governing-path flip with av, the shear cap, and the error seams (non-finite, non-positive geometry / materials, av > d).
Hand-writes its renderer (mirroring the calc-concrete.js `rc-shear-friction` pattern). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the Avf / Af / Asc / cap stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the av = 4 example -> Asc 0.601 in^2, phiVn 100.8 kip).

## 5. Roadmap position

Extends `rc-shear-friction` (the bare interface) into the full corbel design with its flexure, tension, and cap, beside
`concrete-bearing-strength` (the bearing that lands on it). Framing-angle and horizontal-stirrup detailing (Ah >= 0.5
(Asc - An)) and a double-corbel / ledger-beam variant are deliberate future follow-ons. Further Group E growth stays
evidence-driven.
