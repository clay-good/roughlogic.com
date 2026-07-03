# roughlogic.com Specification v334 -- Wood Screw Withdrawal Design Value (NDS 12.2.2) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v332..v334 (the wood-fastener withdrawal trio -- nail (v332),
> lag screw (v333), wood screw (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the wood screw -- and the structural screws that have
> largely replaced lags in decks and framing -- has its own NDS withdrawal equation, scaling with `G^2` and `D` and using
> the full threaded penetration. It sits between the nail and the lag in the withdrawal family the catalog is filling in.
> Adds one tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v333.md.
>
> **The gap, and the evidence for it.** NDS 12.2.2 gives the wood-screw reference withdrawal design value per inch of
> thread penetration as `W = 2,850 x G^2 x D`, with `G` the specific gravity of the holding member and `D` the screw root/
> shank diameter (in); the capacity is `W x p_pen`. For a #10 wood screw (`D = 0.190 in`) in Douglas Fir-Larch (`G = 0.50`),
> `W = 2,850 x 0.25 x 0.190 = 135 lb/in`, so a 1 in penetration holds `135 lb` -- more than three times a 16d nail per inch,
> the reason screws hold a cabinet, a ledger board, or a subfloor where nails back out. The `G^2` dependence means the same
> screw in low-density SPF (`G = 0.42`) holds only `2,850 x 0.176 x 0.190 = 95 lb/in`, a 30% drop the species table hides.
> This tile computes the NDS wood-screw withdrawal value.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specific gravity `G` is
dimensionless; the screw diameter `D` and penetration `p` are lengths (in); the reference withdrawal `W` is a force per
length (lb/in); the capacity is a force (lb); the load-duration `CD` factor is dimensionless. The v18/v21 contract: any
non-finite input, or a specific gravity, diameter, or penetration at or below zero, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the NDS 12.2.2 wood-screw-withdrawal equation by name; `editionNote` names
**the NDS 2018 12.2.2 reference withdrawal `W = 2,850 G^2 D` (lb/in), the capacity `W x p_pen`, the penetration into the
holding member, and that wood-screw withdrawal from end grain is not permitted**, and states that **this returns the
reference wood-screw withdrawal value and capacity -- it applies to a traditional cut-thread wood screw loaded in withdrawal
from side grain (a proprietary structural screw uses its ICC-ES evaluation-report value, which this approximates), uses the
holding member's specific gravity and the entered `CD`, and does not cover the screw's lateral value, head pull-through, or
the installation lead hole; and this is a design aid, not a substitute for the engineer of record or the screw's ESR** --
the structural engineer of record and the fastener's evaluation report govern.

## 2. The tile

### 2.1 `wood-screw-withdrawal` -- Wood Screw Withdrawal Design Value (NDS 12.2.2)

```
inputs:
  G       -    specific gravity of the holding member (0.50 DF-L, 0.42 SPF)
  D_in    in   screw diameter (#10 ~ 0.190)
  p_in    in   penetration into the holding member
  CD      -    load-duration factor (default 1.0)

W = 2850 * G^2 * D_in                             ; reference withdrawal, lb/in
Z_w = W * p_in * CD                               ; withdrawal capacity, lb
```

**Pinned worked example (a #10 wood screw in DF-L, 1 in penetration).** `G = 0.50`, `D = 0.190`, `p = 1.0`, `CD = 1.0`:
`W = 2,850 x 0.50^2 x 0.190 = 2,850 x 0.25 x 0.190 = 135 lb/in`; `Z_w = 135 x 1.0 = 135 lb`. **Cross-check (the same screw
in low-density SPF).** `G = 0.42`: `W = 2,850 x 0.42^2 x 0.190 = 2,850 x 0.1764 x 0.190 = 95.5 lb/in`; `Z_w = 95.5 lb` --
a 30% drop from the softer species (the `G^2` law), the difference between a screw that holds and one that strips in spruce.
The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the wood fastener tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NDS 12.2.2 equation, `editionNote` naming
`W = 2,850 G^2 D`, the `W x p` capacity, the no-end-grain rule, and the cut-thread, side-grain, use-ESR-for-proprietary
caveats); `test/fixtures/worked-examples.json` (the DF-L example + the SPF cross-check); `test/fixtures/compute-map.js`
(`wood-screw-withdrawal` -> `computeWoodScrewWithdrawal` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`wood-nail-withdrawal` / `wood-lag-withdrawal` / `fastener-pullout` / `deck-ledger-fasteners`);
`data/search/aliases.json` ("wood screw withdrawal", "screw pull out", "NDS 12.2.2", "structural screw withdrawal", "screw
holding power", "screw withdrawal design", "G squared withdrawal", "cabinet screw pull out", "subfloor screw capacity");
the id appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (`G`/`CD` dimensionless,
`D`/`p` length, `W` force/length, `Z_w` force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the `G^2` sensitivity, the penetration multiplier, and the non-positive / non-finite error seams. No
new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `G^2` assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `W` / `Z_w` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (#10 in DF-L, 1 in -> 135 lb/in, 135 lb).

## 5. Roadmap position

Closes the wood-fastener withdrawal batch (v332..v334) in `calc-construction.js`: nail, lag, and wood screw withdrawal now
each compute their governing NDS equation, complementing the typical-value `fastener-pullout` tile. The screw lateral
(shear) yield value, a proprietary-structural-screw ESR value input, and the head pull-through of a screwed sheathing panel
are the deliberate next follow-ons once the trio lands. With this batch the wood-connection set spans bolt yield, and nail/
lag/screw withdrawal.
