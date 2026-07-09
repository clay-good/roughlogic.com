# roughlogic.com Specification v548 -- Cast-In Anchor Tension Concrete Breakout (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the concrete design bench); no new module, group, or dependency. Inherits spec.md through spec-v547.md.
>
> **The gap, and the evidence for it.** The bench has `anchor-embedment`, but it only tabulates a bond depth and never
> checks the governing failure of a headed anchor in tension: the concrete **breakout**, a cone of concrete pulled out
> around the anchor. ACI 318-19 Chapter 17 governs it with the concrete capacity design (CCD) method, and it has two
> catches. First, the basic strength scales with the embedment to the **1.5 power** (`Nb = kc x lambda x sqrt(f'c) x
> hef^1.5`), so a near-edge anchor loses capacity to the edge modification factor and a truncated projected area long
> before the steel yields. Second, the constant `kc` changes with the anchor type -- 24 for cast-in, 17 for post-
> installed -- and using the wrong one overstates capacity. The tile takes the embedment, concrete strength, edge
> distance, and anchor type, and returns the basic breakout strength, the edge-modified nominal breakout, and the design
> capacity -- the check `anchor-embedment` never makes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The effective embedment
and edge distance are lengths (`L`, in inches); `f'c` is a stress (`M L^-1 T^-2`, in psi); the projected areas are areas
(`L^2`); the basic, nominal, and design breakout strengths are forces (`M L T^-2`, in lb); the `kc`, `lambda`, and the
modification factors are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive embedment or
`f'c`, a negative edge distance, or an unrecognized anchor type returns `{ error }`. Citation discipline (v19/v22):
`ACI` over Chapter 17; `editionNote` names **ACI 318-19 Section 17.6.2 (concrete breakout in tension, CCD method)**,
prints `Nb = kc x lambda x sqrt(f'c) x hef^1.5` (kc **24 cast-in, 17 post-installed**), `ANco = 9 x hef^2`, the edge
factor `psi_ed = 0.7 + 0.3 x ca1 / (1.5 x hef)` when `ca1 < 1.5 hef` (else 1.0), the projected-area ratio, and
`Ncb = (ANc / ANco) x psi_ed x psi_c x Nb` with `phiNcb = 0.65 x Ncb`, and states that **the basic strength scales with
the embedment to the 1.5 power so a deeper anchor gains fast, a near-edge anchor loses capacity to the edge factor and a
truncated projected area (a full cone needs 1.5 hef of edge on all sides), cast-in and post-installed anchors use
different kc, the cracked-vs-uncracked factor psi_c applies, and ACI 318 Chapter 17 and the engineer of record govern**
-- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `concrete-anchor-breakout` -- The hef^1.5 Cone and Edge Knockdown `anchor-embedment` Skips

```
inputs:
  embedment_in      in    effective embedment depth hef
  fc_psi            psi   concrete compressive strength f'c
  edge_distance_in  in    nearest edge distance ca1 (large value = away from edges)
  anchor_type       -     cast-in (kc = 24) or post-installed (kc = 17)
  lambda            -     lightweight factor (1.0 normalweight)

Nb        = kc x lambda x sqrt(fc) x embedment_in^1.5                                   [lb]
ANco      = 9 x embedment_in^2                                                          [in^2]
psi_ed    = edge_distance_in < 1.5 x embedment_in ? 0.7 + 0.3 x edge_distance_in / (1.5 x embedment_in) : 1.0
ANc       = min(edge_distance_in + 1.5 x embedment_in, 3 x embedment_in) x (2 x 1.5 x embedment_in)   [in^2]  (single near one edge)
Ncb       = (ANc / ANco) x psi_ed x Nb                                                  [lb]
phiNcb    = 0.65 x Ncb                                                                  [lb]
```

**Pinned worked example (a 6 in cast-in anchor, 4000 psi, well away from edges).**
`Nb = 24 x 1.0 x sqrt(4000) x 6^1.5 = 24 x 63.25 x 14.70 = ` **22,308 lb**; with the anchor far from any edge the
projected area is full (`ANc = ANco`) and `psi_ed = 1.0`, so `Ncb = 22,308 lb` and the design capacity is
`phiNcb = 0.65 x 22,308 = ` **14,500 lb**. **Cross-check (a near edge cuts it hard).** Put the same anchor `ca1 = 6 in`
from a free edge (less than `1.5 x 6 = 9 in`): the edge factor is `psi_ed = 0.7 + 0.3 x 6/9 = 0.90`, and the projected
area truncates to `ANc = (6 + 9) x 18 = 270` against `ANco = 324` (a 0.833 ratio), so
`Ncb = 0.833 x 0.90 x 22,308 = 16,725 lb` and `phiNcb = 0.65 x 16,725 = ` **10,871 lb** -- a 25% loss purely to the
edge, long before the steel is the limit. The tile returns the basic strength, the edge-modified nominal breakout, and
the design capacity.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`ACI`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the away-from-edge example + the near-edge cross-
check); `test/fixtures/compute-map.js` (`concrete-anchor-breakout` -> `computeConcreteAnchorBreakout` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `anchor-embedment` / `column-base-plate` /
`masonry-anchor-bolt`); `data/search/aliases.json` ("anchor breakout", "concrete breakout tension", "aci 318 chapter
17", "ccd method", "cast in anchor", "hef breakout", "anchor edge distance", "concrete cone failure"); the id appended
to the concrete renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the hef^1.5 scaling, the cast-in vs post-installed kc, the edge
factor and area truncation, and the error seams (non-finite, non-positive embedment / f'c, negative edge, bad type).
Hand-writes its renderer (mirroring the calc-concrete.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the Nb / Ncb / phiNcb stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the away-from-edge example -> 14,500 lb).

## 5. Roadmap position

Adds the ACI Chapter 17 breakout check the bench lacked, upgrading `anchor-embedment` from a bond depth to a real limit
state, and pairs with `column-base-plate` (which delivers the tension). Anchor pullout, side-face blowout, and a group-
anchor breakout are the natural companions and are deliberate future follow-ons. Further Group E growth stays evidence-
driven.
