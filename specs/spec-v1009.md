# roughlogic.com Specification v1009 -- Minimum Stirrups and the Section-Size Limit (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1008.md. The detailing companion to
> `rc-beam-shear` and `rc-one-way-shear`.
>
> **The gap, and the evidence for it.** `rc-beam-shear`'s own citation names what it leaves out: it "does not check the
> §22.5.1.2 upper limit Vs <= 8 x sqrt(f'c) x bw x d on the section size, the §9.6.3 minimum shear reinforcement, or
> deep-beam action," and its output text says only "minimums still apply." Those minimums were computed nowhere in the
> catalog. This is the gap that lets a beam **pass the strength math and still be under-detailed** -- or be too small
> for its demand in a way no amount of stirrup steel can fix. Alias-index, compute-map, and nearest-sibling-output
> checks confirmed no coverage (`rc-beam-shear` returns `s_max_in` = d/2 only; the d/4 tightening is text, and Av,min
> and the 8 sqrt(f'c) ceiling are absent from its return).
>
> **A correction this spec makes.** ACI 318-19 §9.6.3.1 requires Av,min where `Vu > phi lambda sqrt(f'c) bw d`. The
> 2019 edition **replaced** the ACI 318-14 `Vu > 0.5 phi Vc` trigger, which is still widely quoted. This tile
> implements the 2019 expression.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive f'c, fyt, bw, d, or Av, or a lambda
outside (0, 1.0] returns `{ error }`; `vu_kip = 0` is the detailing-only mode and returns **null** verdicts (not false)
while still computing the minimums. Citation discipline (v19/v22): ACI 318-19 §9.6.3.4, §9.6.3.1, §22.5.1.2, and
§9.7.6.2.2 by name, `GOVERNANCE.general`; the note states that the Table 9.6.3.1 exemptions (shallow beams h <= 10 in,
one-way joists, certain slab-integral members), torsion, deep-beam action, and prestressed members are not modeled.

## 2. The tile

### 2.1 `rc-min-shear-reinforcement` -- Minimum Stirrups and the Section-Size Limit (ACI 318-19 9.6.3)

```
inputs:
  fc_psi   concrete strength f'c (psi), default 4000
  fyt_psi  stirrup yield fyt (psi), default 60000
  bw_in    web width bw (in)
  d_in     effective depth d (in)
  av_in2   stirrup area, both legs (in^2)
  vu_kip   factored shear Vu (kip, 0 = detailing only), default 0
  lambda   lightweight factor, default 1.0

av_min_per_s     = max(0.75 sqrt(f'c) bw / fyt, 50 bw / fyt)        [9.6.3.4]
s_max_av_min_in  = av_in2 / av_min_per_s
trigger_kip      = phi lambda sqrt(f'c) bw d / 1000                 [9.6.3.1]
vc_kip           = 2 lambda sqrt(f'c) bw d / 1000                   [22.5.5.1(a)]
vs_req_kip       = max(0, vu_kip/phi - vc_kip)
vs_max_kip       = 8 sqrt(f'c) bw d / 1000                          [22.5.1.2]
phi_vn_max_kip   = phi (vc_kip + vs_max_kip)
s_max_code_in    = vs_req > 4 sqrt(f'c) bw d ? min(d/4, 12) : min(d/2, 24)   [9.7.6.2.2]
s_max_in         = min(s_max_code_in, s_max_av_min_in)
                                                                     (phi = 0.75)
```

The §22.5.3.1 `sqrt(f'c) <= 100 psi` cap is applied to the shear-**strength** terms (Vc, the 9.6.3.1 trigger, the Vs
limits). The §9.6.3.4 Av,min detailing minimum sits in Chapter 9 and carries no such cap, so it uses the true
`sqrt(f'c)`; the two differ only above f'c = 10,000 psi. This distinction is deliberate and commented in the source.

**Pinned worked example.** f'c = 4,000 psi, fyt = 60,000 psi, 12 x 21.5 in, Av = 0.22 in^2 (#3 two legs), Vu = 40 kip:
`Av,min/s = max(0.0095, 0.0100) = ` **0.0100 in^2/in** (the 50 bw/fyt floor governs below about 4,444 psi);
`s(Av,min) = 0.22/0.0100 = ` **22 in**, but the 9.7.6.2.2 `d/2 = ` **10.75 in** cap governs; the 9.6.3.1 trigger is
**12.24 kip**, so at Vu = 40 kip Av,min is required; the section ceiling is
`phi(32.63 + 130.54) = ` **122.4 kip**. Cross-check: at Vu = 150 kip the same section fails the ceiling
(150 > 122.4, so it must get deeper or wider) and the spacing halves to `d/4 = ` **5.375 in**.

Consistency with the sibling: this tile's `phi Vc = 24.48 kip` and governing `d/2 = 10.75 in` reproduce the numbers
`rc-beam-shear` already publishes for the same section.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, beside `rc-one-way-shear`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (four assumptions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the over-the-ceiling cross-check);
`test/fixtures/compute-map.js` (`rc-min-shear-reinforcement` -> `computeRcMinShearReinforcement`);
`scripts/related-tiles.mjs` (-> `rc-beam-shear` / `rc-one-way-shear` / `concrete-torsion-threshold`);
`data/search/aliases.json` (7 collision-checked search aliases plus 5 question-corpus phrases), then
`node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in `CONCRETE_RENDERERS`,
and the id added to the calc-concrete declare list in `app.js`; the `// dims:` annotation directly above the compute;
a `bounds-fuzzer.test.js` block pinning both examples, the 4,444 psi crossover, the ceiling's independence from
stirrup area, the null-verdict detailing mode, and the error seams; regenerated v14 corpus + tile-index +
citation-strings. Home tile count 1,457 -> 1,458.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
worked-examples runner; render + output read to the value (12 x 21.5 in, #3 stirrups -> 0.0100 in^2/in, 10.75 in).

## 5. Roadmap position

Closes the ACI 318-19 beam-shear triad: strength with stirrups (`rc-beam-shear`), strength without
(`rc-one-way-shear`), and now the detailing minimums and section-size ceiling that bound both. Serves the concrete
contractor and the plan reviewer. Deliberately the code-minimum screen; torsion, deep beams, prestressing, and the
Table 9.6.3.1 exemptions stay separate. Like v1008, this came from reading an existing tile's self-declared
limitations rather than from a discovery sweep -- a vein that remains productive in a catalog whose forward tile
discovery is saturated.
