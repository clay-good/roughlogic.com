# roughlogic.com Specification v333 -- Lag Screw Withdrawal Design Value (NDS 12.2.1) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v332..v334 (the wood-fastener withdrawal trio -- nail (v332),
> lag screw (this spec), wood screw (v334)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the lag screw is the workhorse of ledger and heavy-
> connection withdrawal, and its NDS withdrawal equation differs from the nail's -- it scales with `D^(3/4)`, not `D`, and
> uses the thread penetration, not the total. The catalog computes neither. Adds one tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v332.md.
>
> **The gap, and the evidence for it.** NDS 12.2.1 gives the lag-screw reference withdrawal design value per inch of thread
> penetration as `W = 1,800 x G^(3/2) x D^(3/4)`, with `G` the specific gravity of the holding member and `D` the shank
> diameter (in); the capacity is `W x p_thread`, the length of thread embedded in the main member. For a 1/2 in lag in
> Douglas Fir-Larch (`G = 0.50`), `W = 1,800 x 0.50^1.5 x 0.5^0.75 = 378 lb/in`, so 4 in of thread penetration holds
> `378 x 4 = 1,514 lb` before load-duration adjustment -- a ledger lag's real withdrawal capacity, roughly 25 times a 16d
> nail's, and the number the IRC deck-ledger tables are built on. The `D^(3/4)` exponent means a bigger lag helps less than
> its area suggests, so penetration and count carry the load. This tile gives the NDS lag-withdrawal value the deck and
> ledger details rely on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specific gravity `G` is
dimensionless; the shank diameter `D` and thread penetration `p_thread` are lengths (in); the reference withdrawal `W` is a
force per length (lb/in); the capacity is a force (lb); the load-duration `CD` factor is dimensionless. The v18/v21
contract: any non-finite input, or a specific gravity, diameter, or penetration at or below zero, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the NDS 12.2.1 lag-withdrawal equation by name; `editionNote` names
**the NDS 2018 12.2.1 reference withdrawal `W = 1,800 G^(3/2) D^(3/4)` (lb/in), the capacity `W x p_thread` on the thread
penetration (excluding the tapered tip), and that lag withdrawal from end grain takes the `Ceg = 0.75` factor**, and states
that **this returns the reference lag-screw withdrawal value and capacity -- it uses the thread penetration in the holding
member (not the full length), the holding member's specific gravity, and the entered `CD` (and `Ceg` if end grain), and
does not cover the lag's lateral (shear) design value (the yield-limit model), the required lead-hole/installation, or the
washer bearing; and this is a design aid, not a substitute for the engineer of record** -- the structural engineer of
record's stamped design governs.

## 2. The tile

### 2.1 `wood-lag-withdrawal` -- Lag Screw Withdrawal Design Value (NDS 12.2.1)

```
inputs:
  G          -    specific gravity of the holding member
  D_in       in   lag shank diameter
  p_thread   in   thread penetration into the holding member
  CD         -    load-duration factor (default 1.0)
  end_grain  -    installed into end grain? (Ceg = 0.75)

W = 1800 * G^1.5 * D_in^0.75                       ; reference withdrawal, lb/in
Ceg = end_grain ? 0.75 : 1.0
Z_w = W * p_thread * CD * Ceg                       ; withdrawal capacity, lb
```

**Pinned worked example (a 1/2 in lag in DF-L, 4 in thread penetration).** `G = 0.50`, `D = 0.5`, `p = 4`, `CD = 1.0`, side
grain: `W = 1,800 x 0.50^1.5 x 0.5^0.75 = 1,800 x 0.3536 x 0.5946 = 378 lb/in`; `Z_w = 378 x 4 = 1,514 lb`. **Cross-check
(a 5/8 in lag, same penetration).** `D = 0.625`: `W = 1,800 x 0.3536 x 0.625^0.75 = 1,800 x 0.3536 x 0.7017 = 447 lb/in`;
`Z_w = 447 x 4 = 1,787 lb` -- a 25% larger diameter buys only 18% more withdrawal (the `D^(3/4)` law), the reason more or
deeper lags beat bigger ones. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the wood fastener tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NDS 12.2.1 equation, `editionNote` naming
`W = 1,800 G^1.5 D^0.75`, the thread-penetration capacity, `Ceg = 0.75`, and the side-grain, not-lateral caveats);
`test/fixtures/worked-examples.json` (the 1/2 in example + the 5/8 in cross-check); `test/fixtures/compute-map.js`
(`wood-lag-withdrawal` -> `computeWoodLagWithdrawal` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`wood-nail-withdrawal` / `wood-screw-withdrawal` / `deck-ledger-fasteners` / `fastener-pullout`);
`data/search/aliases.json` ("lag screw withdrawal", "lag bolt pullout", "NDS 12.2.1", "ledger lag capacity", "lag
withdrawal design", "thread penetration lag", "lag holding power", "deck ledger lag", "lag screw pull out"); the id
appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (`G`/`CD`/`Ceg` dimensionless,
`D`/`p` length, `W` force/length, `Z_w` force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the `D^0.75` sensitivity, the `Ceg` factor, and the non-positive / non-finite error seams. No new
module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `D^0.75` assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `W` / `Z_w` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1/2 in lag DF-L, 4 in -> 378 lb/in, 1,514 lb).

## 5. Roadmap position

Middle of the wood-fastener withdrawal batch (v332..v334) in `calc-construction.js`, adding the lag equation beside the
nail. The wood screw (v334) follows. The lag lateral (shear) yield-limit value, the required lead-hole and washer bearing,
and a deck-ledger connection chain into `deck-ledger-fasteners` are the deliberate next follow-ons once the trio lands.
