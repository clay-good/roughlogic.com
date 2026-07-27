# roughlogic.com Specification v1019 -- Cast-In Anchor Shear Concrete Breakout (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1018.md. Completes the
> deliberately-deferred fourth member of the anchor family (`concrete-anchor-breakout` tension /
> `concrete-anchor-pullout` / `concrete-anchor-blowout`).
>
> **The gap, and the evidence for it.** The tension tile's citation says outright: "anchor shear and combined
> shear-tension (pryout) are separate checks," and its Scope line repeats it. The alias index has 30+ `breakout`
> aliases and every one targets the TENSION tile; `compute-map.js` shows the family is exactly breakout / pullout /
> blowout -- nothing returns a shear capacity, and `computeConcreteAnchorBreakout` is `hef^1.5`-driven with no
> `ca1^1.5` term. Shear breakout at an edge routinely governs base plates, ledgers, and equipment anchorage.
> This tile was deferred on 2026-07-23 pending verification of eight coefficients against the primary standard;
> all eight were verified 2026-07-27 against independent corroborating sources (see section 3).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (`// dims:` above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive da / hef / f'c / ca1, a negative
ca2 / ha, or an unknown cracking state returns `{ error }`. Citation discipline (v19/v22): ACI 318-19 by section
number only, no standard table text reproduced -- every constant is a published equation coefficient, not a table
row. `GOVERNANCE.general`. Renderer is the `_simpleRenderer` factory matching the three anchor siblings in this
module.

## 2. The tile

### 2.1 `concrete-anchor-shear-breakout` -- Cast-In Anchor Shear Concrete Breakout (ACI 318-19 17.7.2)

```
inputs:
  anchor_dia_in       anchor diameter da (in)
  embedment_in        effective embedment hef (in); load-bearing length le = min(hef, 8 da)
  fc_psi              concrete strength f'c (psi, default 4000)
  edge_distance_in    ca1, edge distance IN THE DIRECTION of the shear (in) -- required; far from an
                      edge, shear breakout does not apply (steel or pryout governs instead)
  perp_edge_in        ca2, perpendicular edge distance (in, 0 = far away)
  member_thickness_in ha, member thickness (in, 0 = thick member)
  cracking            cracked (psi_cV = 1.0) | uncracked (psi_cV = 1.4)
  lambda              lightweight factor lambda_a (default 1.0)

compute:
  le      = min(hef, 8 da)                                          17.7.2.2.2
  Vb      = min( 7 (le/da)^0.2 sqrt(da), 9 ) lambda_a sqrt(f'c) ca1^1.5    17.7.2.2.1(a)/(b), lb
  AVco    = 4.5 ca1^2                                               17.7.2.1.3
  AVc     = [min(1.5 ca1, ha or inf)] x [1.5 ca1 + min(1.5 ca1, ca2 or inf)]   single anchor, one loaded edge
  psi_edV = 1.0 if ca2 >= 1.5 ca1 (or far), else 0.7 + 0.3 ca2/(1.5 ca1)       17.7.2.4.1
  psi_cV  = 1.0 cracked (no supplementary reinforcement) | 1.4 uncracked        17.7.2.5.1
  psi_hV  = sqrt(1.5 ca1 / ha) >= 1.0 when ha < 1.5 ca1, else 1.0               17.7.2.6.1
  Vcb     = (AVc/AVco) psi_edV psi_cV psi_hV Vb                                 17.7.2.1(a)
  phiVcb  = 0.70 Vcb          (Condition B, no supplementary reinforcement, Table 17.5.3)

outputs:
  vb_lb, governing_form (7-form | 9-cap), le_in, AVco, AVc, area_ratio,
  psi_edV, psi_cV, psi_hV, vcb_lb, phi_vcb_lb, note
```

**Worked example (pinned).** 3/4-in cast-in anchor, hef = 6 in, f'c = 4,000 psi, ca1 = 6 in, no nearby second
edge, thick member, cracked, normalweight. le = min(6, 6) = 6 in; the 7-form coefficient is
7 (8)^0.2 sqrt(0.75) = 9.189 > 9, so the **9-cap governs**: Vb = 9 sqrt(4000) 6^1.5 = 8,365.6 lb = Vcb;
phiVcb = 5,856 lb. Second pinned case, corner + thin member (ca2 = 4 in, ha = 6 in): psi_edV = 0.8333,
psi_hV = 1.2247, AVc = 6 x 13 = 78 in^2 vs AVco = 162 in^2, Vcb = 4,111 lb, phiVcb = 2,878 lb -- the corner
cuts the design capacity in half, which is exactly the situation the tile exists to catch.

## 3. Coefficient verification (the reason this was deferred, now discharged)

Each item cross-verified 2026-07-27 against at least two independent sources (Williams Form Engineering
ACI 318 anchoring reference, 318-19 section numbering; ICC-ES ESR-3068 per ACI 318-19; K-State/PCA-notes worked
examples; IDEA StatiCa AISC anchor check; mechguru worked example reproducing the 7-form to 23,482.6 lb, which
this implementation matches when the le cap is wider):

1. Vb pair 17.7.2.2.1(a)/(b): 7 (le/da)^0.2 sqrt(da) lambda_a sqrt(f'c) ca1^1.5 and 9 lambda_a sqrt(f'c) ca1^1.5,
   LESSER governs. The (b) form has **no sqrt(da)** (one secondary source renders it with sqrt(da); the
   manufacturer reference and the equation's role as a stiff-anchor cap both say otherwise -- excluded).
2. psi_edV = 0.7 + 0.3 ca2/(1.5 ca1) when ca2 < 1.5 ca1, else 1.0.
3. psi_hV = sqrt(1.5 ca1/ha) >= 1.0 when ha < 1.5 ca1.
4. psi_cV = 1.0 cracked without supplementary reinforcement, 1.4 uncracked. (The 1.2/1.4 with-edge-reinforcement
   options exist in 17.7.2.5.1 but are NOT offered -- taking 1.0 is conservative and mirrors the tension
   sibling's psi_c = 1.0 simplification.)
5. phi = 0.70 shear concrete breakout, Condition B (ESR-3068 states it verbatim per ACI 318-19 17.5.3).
6. AVc single-anchor geometry: depth min(1.5 ca1, ha) x width 1.5 ca1 + min(1.5 ca1, ca2); AVco = 4.5 ca1^2
   (mechguru example reproduces both).
7. (pryout kcp values verified but OUT of this tile's scope -- separate follow-on tile.)
8. (steel Vsa = 0.6 Ase futa verified but OUT of scope -- separate follow-on tile.)

## 4. Scope limits

Single cast-in anchor, one loaded edge, shear applied perpendicular TOWARD the edge (the 17.7.2.1(c) parallel-
to-edge doubling and the corner minimum-of-two-directions check are not modeled). No anchor groups, no
eccentricity (psi_ecV), no supplementary-reinforcement psi_cV credits, no seismic 0.75 reduction. Steel shear and
pryout are separate checks (follow-on tiles). The fuzzer pins: 9-cap vs 7-form crossover, the two boundary
continuities (ca2 = 1.5 ca1, ha = 1.5 ca1), Vcb <= Vb for the cracked case, and ca1^1.5 monotonicity. ACI 318
Chapter 17 and the engineer of record govern -- a design check, not a stamped anchor design.

## 5. Wiring

`calc-concrete.js` (compute + `_simpleRenderer`, `CONCRETE_RENDERERS["concrete-anchor-shear-breakout"]`),
`tools-data.js` (Group E block, after the blowout sibling), `tile-meta.js`, `app.js` declare list,
`citations.js`, `test/fixtures/compute-map.js`, `test/fixtures/worked-examples.json`,
`scripts/related-tiles.mjs` (+ backlink from the tension tile whose citation names this gap),
`data/search/aliases.json` (+ regenerated shards), `test/unit/bounds-fuzzer.test.js`, regenerated
corpus / tile-index / citation-strings artifacts, CHANGELOG entry, and the two index.html catalog-count spots.
Cap ledger: `calc-concrete.js` 36000 checked post-build.
