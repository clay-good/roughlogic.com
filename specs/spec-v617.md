# roughlogic.com Specification v617 -- Concrete Anchor Side-Face Blowout (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, structural); no new module, group, or dependency. Inherits spec.md through spec-v616.md.
>
> **The gap, and the evidence for it.** Spec-v548 (`concrete-anchor-breakout`) names this tile as a companion --
> "Anchor pullout, side-face blowout, and a group-anchor breakout are the natural companions" -- and spec-v612
> (`concrete-anchor-pullout`) repeats it: "Side-face blowout and a group-anchor breakout remain deliberate future
> follow-ons." The bench now checks two of the three concrete tension failure modes of a headed anchor; the third
> is the one deep anchors near an edge actually hit. Past `hef > 2.5 c_a1`, deepening the anchor stops helping --
> the head's lateral bursting pressure spalls the side face off before a breakout cone can form, and the strength
> stops depending on embedment entirely: **ACI 318-19 17.6.4** gives `Nsb = 160 c_a1 sqrt(Abrg) lambda_a sqrt(f'c)`
> for the single headed anchor, cut by `(1 + c_a2/c_a1)/4` at a corner (`c_a2 < 3 c_a1`), with `phi = 0.70`
> (Condition B). The number that surprises people: the same 3/4-in heavy-hex anchor whose cracked design pullout
> checks 14.6 kip (v612's example) is worth **17.2 kip** design side-face blowout at a 3 in edge -- and **10.0 kip** in a
> corner with a 4 in second edge. The edge distance, not the embedment, is the knob.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The edge distances,
embedment, and bearing-area inputs are `L` / `L^2` (in, in^2); the concrete strength is a stress (`M L^-1 T^-2`,
psi); lambda and the corner factor are `dimensionless`; the basic, nominal, and design strengths are forces
(`M L T^-2`, lb). The v18/v21 contract: any non-finite input, a non-positive edge distance / bearing area /
concrete strength / embedment, a lambda outside `(0, 1]`, or a perpendicular edge distance that is positive but
smaller than `c_a1` (`c_a1` is defined as the minimum edge distance) returns `{ error }`. A perpendicular edge of
0 means "no near second edge" (factor 1.0), and `c_a2 >= 3 c_a1` also takes factor 1.0. Side-face blowout governs
only for deep embedment: the tile computes an `applicable` flag (`hef > 2.5 c_a1`) and says plainly when breakout
governs instead. Citation discipline (v19/v22): `GOVERNANCE.general` over **ACI 318-19 Section 17.6.4** by name
(matching the `concrete-anchor-breakout` / `concrete-anchor-pullout` siblings); `editionNote` prints
`Nsb = 160 x c_a1 x sqrt(Abrg) x lambda_a x sqrt(f'c)`, the corner modification `(1 + c_a2/c_a1)/4` for
`c_a2 < 3 c_a1`, and `phiNsb = 0.70 x Nsb`, and states that **blowout applies to headed cast-in anchors with deep
embedment near an edge (hef > 2.5 c_a1; shallower anchors are governed by breakout), the strength does not depend
on embedment, closely spaced anchors along the edge interact per 17.6.4.2 (a group tile remains a follow-on), and
ACI 318 Chapter 17 and the engineer of record govern** -- a design check, not a stamped anchor design.

## 2. The tile

### 2.1 `concrete-anchor-blowout` -- The Deep-Anchor-Near-an-Edge Failure Mode

```
inputs:
  edge_distance_in    in     c_a1, distance from anchor centerline to the nearest edge
  head_bearing_area_in2 in^2 Abrg, net bearing area of the head or nut
  fc_psi              psi    concrete compressive strength f'c
  embedment_in        in     hef (applicability only: blowout governs when hef > 2.5 c_a1)
  perp_edge_in        in     c_a2, perpendicular edge distance (0 = no near second edge)
  lambda              -      lightweight-concrete factor lambda_a (1.0 normal weight)

nsb_lb        = 160 x c_a1 x sqrt(Abrg) x lambda x sqrt(f'c)                 [lb]
corner_factor = perp 0 or >= 3 c_a1 ? 1.0 : (1 + c_a2/c_a1) / 4              [-]
nsbn_lb       = nsb_lb x corner_factor                                       [lb]
phi_nsb_lb    = 0.70 x nsbn_lb                                               [lb]
applicable    = embedment_in > 2.5 x edge_distance_in
```

**Pinned worked example (the v612 anchor moved to a 3 in edge).** A 3/4-in heavy-hex headed anchor
(`Abrg = 0.654 in^2`), `f'c = 4000 psi`, normal weight, 10 in embedment, 3 in edge, no near second edge:
`hef = 10 > 2.5 x 3 = 7.5`, so blowout governs; `Nsb = 160 x 3 x sqrt(0.654) x sqrt(4000) = ` **24,550 lb**
(24.6 kip) and `phiNsb = ` **17,185 lb** (17.2 kip). **Cross-check (the corner).** The same anchor with a second
edge at `c_a2 = 4 in < 3 x 3 = 9 in`: `corner factor = (1 + 4/3)/4 = 0.5833`, `Nsbn = ` **14,321 lb**,
`phiNsb = ` **10,025 lb** -- the corner takes 42% off. A shallow anchor (`hef = 6 in <= 7.5 in`) reports the same
arithmetic with the applicability flag down: breakout, not blowout, governs there.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `concrete-anchor-pullout`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`concrete-anchor-blowout` ->
`computeConcreteAnchorBlowout` in `../../calc-concrete.js`); `scripts/related-tiles.mjs` (->
`concrete-anchor-breakout` / `concrete-anchor-pullout` / `anchor-embedment`); `data/search/aliases.json` ("side
face blowout", "anchor blowout", "blowout strength", "deep anchor near edge", plus question rows);
`CONCRETE_RENDERERS["concrete-anchor-blowout"]` via the module's `_simpleRenderer` factory (mirroring
`concrete-anchor-pullout`) and the id added to the concrete declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the linear c_a1 scaling, the sqrt f'c scaling, the corner-factor bounds (c_a2 = 3 c_a1 -> 1.0), the
applicability seam, and the error seams (non-finite, non-positive inputs, lambda out of (0, 1], c_a2 in (0, c_a1)).
The calc-concrete.js gzip cap (23000, 88.9% used) is expected to hold without a raise (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 17,185 lb design).

## 5. Roadmap position

Completes the headed-anchor tension triad spec-v548 named: breakout (v548), pullout (v612), and side-face blowout
(this tile) -- the three concrete failure modes of ACI 318-19 17.6. The 17.6.4.2 closely-spaced group interaction
and the group-anchor breakout (ANc area method) remain deliberate future follow-ons. Further Group E growth stays
evidence-driven.
