# roughlogic.com Specification v1018 -- Soil Gradation Coefficients Cu / Cc (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1017.md. Sits between
> `atterberg-indices` and `fineness-modulus`, the two tiles that name this gap.
>
> **The gap, and the evidence for it.** Two tiles in two different modules name it independently:
> `atterberg-indices` says "the full USCS also needs the fines content and **gradation** for a coarse or dual
> classification" and "it does not compute ... the **coarse-fraction sieve classification**"; `fineness-modulus` says
> its single number "does not check whether each sieve meets its C33 grading band, and **two very different
> gradations can share an FM**." So the catalog has the fine-grained half of USCS (the A-line plasticity chart) and a
> one-number gradation summary, and nothing that describes the *shape* of a grain-size curve. A grep of the tile-id
> list for `gradation`, `uscs`, `d60`, `curvature`, `uniformity`, and `sieve` returned no coarse-fraction tile. The
> number this settles: whether a soil will actually compact, which a fineness modulus cannot tell you.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive D10/D30/D60, a decreasing size set
(`D10 > D30` or `D30 > D60`, a data-entry error since all three come off one curve), or a percentage outside [0, 100]
returns `{ error }`. Citation discipline (v19/v22): ASTM D2487 (USCS) and D6913 (sieve analysis) **by name only**, no
standard table text reproduced -- the well-graded thresholds are three published numbers, not a table -- plus Hazen
(1892); `GOVERNANCE.general`. The renderer is a hand-written `_v1018render...` matching the `fineness-modulus`
sibling in this module (non-exported, so it adds no corpus row and needs no DOM sentinel).

## 2. The tile

### 2.1 `soil-gradation-coefficients` -- Soil Gradation Coefficients Cu / Cc (USCS, ASTM D2487)

```
inputs:
  d10_mm                    D10, the effective size (mm)
  d30_mm                    D30 (mm)
  d60_mm                    D60 (mm)
  pct_coarse_passing_no4    % of the COARSE fraction passing the #4 sieve (default 60; <= 50 = gravel)
  pct_fines                 % passing the #200 sieve (default 0)

compute:
  Cu = D60 / D10                          spread: how wide a range of sizes is present
  Cc = D30^2 / (D10 x D60)                shape: smooth curve, or a gap in the middle
  coarse type   = gravel if <= 50% of the coarse fraction passes the #4, else sand
  Cu threshold  = 4 (gravel) or 6 (sand)
  well graded   = Cu >= threshold AND 1 <= Cc <= 3      -- BOTH required
  fines ladder  = < 5% clean symbol | 5-12% dual symbol | > 12% the fines govern
  Hazen k (cm/s) = D10^2 (D10 in mm), valid only for Cu < 5, D10 0.1-3 mm, < 5% fines

outputs:
  cu, cc, coarse_type, cu_threshold, cu_ok, cc_ok, well_graded,
  fines_class, uscs_symbol, hazen_k_cm_s, hazen_valid, note
```

**Why both criteria, not just Cu.** Cu alone rewards a soil for containing a wide range of sizes, but says nothing
about whether the sizes in between are actually *there*. A gap-graded soil can post an enormous Cu and still pack no
better than a uniform sand. Cc is what catches it: a gap drives `D30` toward one end and pushes Cc outside 1-3. The
bounds-fuzzer pins exactly this case -- `D10 0.15, D30 0.16, D60 20` gives Cu > 100 (passes) and Cc < 1 (fails), so
the soil is correctly reported POORLY graded.

**Why the same curve gets two answers.** The gravel threshold is 4 and the sand threshold is 6, so a curve with
Cu = 5 and Cc in range is a **well-graded gravel and a poorly-graded sand** depending only on which side of the #4
sieve the coarse fraction sits. The fuzzer pins both readings of one curve.

**Why fines are an input.** Below 5% passing the #200 the gradation symbol governs (GW/GP/SW/SP). Between 5% and 12%
a dual symbol is required and the Atterberg limits on the fines decide the M or C half. Above 12% the fines govern
outright and the soil is GM/GC/SM/SC *regardless* of Cu and Cc. Without this input the tile would confidently report
"SW" for a soil whose behavior the fines control, so it stops claiming a gradation symbol and points at
`atterberg-indices` instead.

**Hazen is flagged, never silent.** `k = D10^2 cm/s` is the classic use of the effective size, and it is wrong
outside a narrow band. The tile always computes it and always states whether the inputs are inside the validity range
(Cu < 5, D10 between 0.1 and 3 mm, under 5% fines); the worked example is deliberately **outside** it (Cu 8.0), so
the flag is exercised by the pinned case rather than only by a fuzzer edge.

**Worked example (pinned).** D10 = 0.15 mm, D30 = 0.55 mm, D60 = 1.2 mm, 60% of the coarse fraction passing the #4,
3% fines. Cu = 1.2 / 0.15 = 8.0 (>= 6 for a sand, OK); Cc = 0.55^2 / (0.15 x 1.2) = 0.3025 / 0.18 = 1.68056 (inside
1-3, OK). Both hold and the fines are under 5%, so the symbol is **SW**, a well-graded sand. Hazen k = 0.0225 cm/s
but Cu 8.0 exceeds the uniformity limit, so it is reported OUT of range.

## 3. Scope limits

Three points off the grain-size curve, not the full sieve analysis and not a grading-band check against any
purchased ASTM table. The coarse/fine split is taken as an input rather than derived. Cu and Cc describe a coarse
soil; a fine-grained soil is classified by `atterberg-indices`. The laboratory gradation report and the geotechnical
engineer of record govern.

## 4. Wiring

`calc-earthwork.js` (compute + hand-written `_v1018renderSoilGradationCoefficients`,
`EARTHWORK_RENDERERS["soil-gradation-coefficients"]`), `tools-data.js`, `tile-meta.js`, `app.js` declare list,
`citations.js`, `test/fixtures/compute-map.js`, `test/fixtures/worked-examples.json`, `scripts/related-tiles.mjs`
(including backlinks from both parents that name the gap), `data/search/aliases.json` (+ regenerated shards),
`test/unit/bounds-fuzzer.test.js`, and the regenerated corpus / tile-index / derivations artifacts. One cap-ledger
bump: `calc-earthwork.js` was at 96.4% before this tile.
