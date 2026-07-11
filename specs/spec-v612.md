# roughlogic.com Specification v612 -- Concrete Headed-Anchor Pullout (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the ACI concrete bench); no new module, group, or dependency. Inherits spec.md through spec-v611.md.
>
> **The gap, and the evidence for it.** Spec-v548 (`concrete-anchor-breakout`) names this tile as a deliberate
> follow-on: "Anchor pullout, side-face blowout, and a group-anchor breakout are the natural companions." The breakout
> tile covers the concrete cone that levers out around a tension anchor; pullout is the other tension failure mode ACI
> requires and it governs on a shallow, large-headed anchor -- the head simply crushing and dragging through the
> concrete before a cone can form. ACI 318-19 17.6.3 makes it a one-line check: the basic pullout strength of a headed
> anchor is `Np = 8 x Abrg x f'c`, the head's bearing area times eight times the concrete strength, and the design
> value is `phiNpn = phi x psi_cP x Np`, where psi_cP is 1.4 when the concrete stays uncracked at service load and 1.0
> when it may crack. A 3/4-inch headed bolt with a 0.654-square-inch head in 4,000-psi cracked concrete pulls out at a
> factored **14.6 kips** -- a number that is easy to forget because it does not depend on embedment at all, so a
> designer who deepened the anchor to fix breakout has not moved pullout one pound. The tile computes the basic and
> design pullout so the anchor is checked against the mode the breakout calc never sees.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The head bearing area is
`L^2` (in^2), the concrete strength a stress `M L^-1 T^-2` (psi), and the pullout strengths forces `M L T^-2` (lb /
kip); the 8, psi_cP, and phi factors are `dimensionless`, all carried dimensionless to the parse-only lint alongside
the `concrete-anchor-breakout` sibling. The v18/v21 contract: any non-finite input, or a non-positive head bearing area
or concrete strength returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI 318-19
Section 17.6.3 headed-anchor pullout by name (matching the `concrete-anchor-breakout` sibling); `editionNote` prints
`Np = 8 x Abrg x fc`, `Npn = psi_cP x Np` (psi_cP = 1.4 uncracked at service, 1.0 cracked), and
`phiNpn = phi x Npn` with phi = 0.70 (Condition B, no supplementary reinforcement, cast-in headed anchor), and states
that **pullout does not depend on embedment (deepening the anchor does not raise it), it applies to headed anchors
where the head bears on the concrete (not to adhesive or expansion anchors, which use a tested bond or slip value),
Abrg is the net bearing area of the head or nut, the psi_cP factor rewards uncracked concrete only when analysis shows
it stays uncracked, and ACI 318 and the engineer of record govern** -- a design check, not a stamped anchor design.

## 2. The tile

### 2.1 `concrete-anchor-pullout` -- Headed-Anchor Pullout Strength (ACI 318-19 17.6.3)

```
inputs:
  head_bearing_area_in2   in2    net bearing area of the anchor head/nut, Abrg
  fc_psi                  psi    specified concrete compressive strength
  cracking                select cracked | uncracked   (psi_cP = 1.0 / 1.4)

Np_lb    = 8 x head_bearing_area_in2 x fc_psi                 [lb]   (basic pullout, ACI 17.6.3.2)
Npn_lb   = psi_cP x Np_lb                                     [lb]   (psi_cP = 1.4 uncracked, 1.0 cracked)
phiNpn_lb = 0.70 x Npn_lb                                     [lb]   (phi Condition B)
```

**Pinned worked example (a 3/4-inch headed bolt, 0.654-in^2 head, 4,000-psi cracked concrete).**
`Np = 8 x 0.654 x 4,000 = ` **20,928 lb (20.9 kip)**, and cracked so `Npn = 1.0 x 20,928 = 20,928 lb`, giving
`phiNpn = 0.70 x 20,928 = ` **14,650 lb (14.6 kip)** of design pullout -- independent of how deep the bolt is set.
**Cross-check (a 1-inch bolt, 1.05-in^2 head, 5,000-psi uncracked concrete).**
`Np = 8 x 1.05 x 5,000 = ` **42,000 lb**, uncracked so `Npn = 1.4 x 42,000 = ` **58,800 lb**, and
`phiNpn = 0.70 x 58,800 = ` **41,160 lb (41.2 kip)** -- the 1.4 uncracked bonus is the difference between a 41-kip and
a 29-kip anchor, so claiming it requires showing the concrete stays uncracked.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`concrete-anchor-pullout` -> `computeConcreteAnchorPullout` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `concrete-anchor-breakout` / `anchor-embedment` / `column-base-plate`);
`data/search/aliases.json` ("anchor pullout", "headed anchor pullout", "aci pullout", "concrete anchor tension", "bolt
pullout concrete", plus question rows); the id appended to the calc-concrete declare list in `app.js` and the
`CONCRETE_RENDERERS["concrete-anchor-pullout"] = _simpleRenderer({...})` block; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
cracked-vs-uncracked psi_cP switch, the embedment-independence (unchanged if hef changes -- there is no hef input), and
the error seams (non-finite, non-positive area / fc). Renderer uses the module's `_simpleRenderer` factory (mirroring
`concrete-anchor-breakout`). Group E has no exact per-group audit count (`>= 30`), so no count bump. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**, calc-concrete gzip cap
raised if the build reports it over); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(the 3/4-inch example -> 14.6 kip design pullout).

## 5. Roadmap position

Adds the pullout mode `concrete-anchor-breakout` named as its companion, beside `anchor-embedment` and
`column-base-plate`. Side-face blowout and a group-anchor breakout remain deliberate future follow-ons. Further Group E
growth stays evidence-driven.
