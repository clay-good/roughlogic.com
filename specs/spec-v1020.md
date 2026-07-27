# roughlogic.com Specification v1020 -- Concrete Anchor Pryout in Shear (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1019.md. Second of the shear
> failure modes the tension tile's citation names as "separate checks" (spec-v1019 took concrete breakout in
> shear; this takes pryout).
>
> **The gap, and the evidence for it.** The tension tile's Scope assumption says "axial tension only; anchor
> shear (pryout) and combined shear-tension are separate checks." `aliases.json` had zero hits for `pryout`
> before this tile; `compute-map.js` shows nothing computing a pryout capacity. Pryout is the mode that
> GOVERNS short stiff anchors AWAY from an edge loaded in shear -- exactly the case where spec-v1019's
> edge-breakout check does not apply -- so without it the shear story had a hole precisely where the edge
> check exits.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-finite or
non-positive inputs return `{ error }` (delegated to the tension sibling's own guards where shared). Citation
discipline: ACI 318-19 by section number only. `GOVERNANCE.general`. Renderer: `_simpleRenderer` factory
matching the anchor siblings.

## 2. The tile

### 2.1 `concrete-anchor-pryout` -- Concrete Anchor Pryout in Shear (ACI 318-19 17.7.3)

```
inputs:  embedment_in (hef), fc_psi, edge_distance_in (ca1, min edge; large = away),
         anchor_type (cast-in kc 24 | post-installed kc 17), lambda
compute: Ncp = Ncb  -- computed by CALLING the landed computeConcreteAnchorBreakout directly
                      (same module), so the two tiles can never drift apart
         kcp = 1.0 for hef < 2.5 in, 2.0 for hef >= 2.5 in     17.7.3.1
         Vcp = kcp x Ncp                                        17.7.3.1(a)
         phiVcp = 0.70 Vcp   (Condition B, Table 17.5.3)
outputs: ncb_lb, kcp, vcp_lb, phi_vcp_lb, note
```

**Verification.** All three constants were verified 2026-07-27 against independent sources during the
spec-v1019 primary-source pass: kcp = 1.0 / 2.0 with the 2.5-in threshold (Panache Ch.17 guide; ICC-ES
ESR-3068 lists kcp = 1.0 for its hef = 1.23 in anchor, consistent; ICC-ES ESR language "using the value of
kcp and the value of Ncb"), Vcp = kcp Ncp with Ncp = Ncb (Williams Form 318-19 reference, 17.7.3.1a; K-State
worked example computes Vcp = 2.0 x Ncb with phi = 0.70 Condition B).

**Worked example (pinned).** Cast-in anchor, hef = 6 in, f'c = 4,000 psi, far from every edge (ca1 large):
Ncb = 24 sqrt(4000) 6^1.5 = 22,308.4 lb; kcp = 2.0; Vcp = 44,616.8 lb; phiVcp = 31,231.7 lb. Seam case:
hef = 2.5 in exactly gives Ncb = 6,000.0 lb, kcp = 2.0, Vcp = 12,000 lb, phiVcp = 8,400 lb -- and one hair
shallower (hef = 2) drops kcp to 1.0 (Vcp = 4,293 lb): the fuzzer pins both sides of the threshold.

## 3. Scope limits

Single anchor; the group form Vcpg = kcp Ncbg is not modeled. Ncb inherits every simplification the tension
tile documents (psi_c = 1.0, Condition B, single edge). Steel shear (0.6 Ase futa) and edge shear breakout
are separate checks -- `concrete-anchor-shear-breakout` covers the edge mode; a shear design takes the LEAST
of steel, edge breakout, and pryout. ACI 318 Chapter 17 and the engineer of record govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5 (all registries, fixtures, fuzzer, aliases + shards, corpus /
tile-index regen, CHANGELOG, two index.html count spots). Fuzzer's primary pin is the cross-implementation
identity `computeConcreteAnchorPryout(...).ncb_lb === computeConcreteAnchorBreakout(...).ncb_lb` exactly, at
a non-trivial near-edge geometry. calc-concrete.js cap raised 36000 -> 40000 if the build crosses it (it sat
at 98.8% before this tile).
