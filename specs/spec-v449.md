# roughlogic.com Specification v449 -- Masonry Headed Anchor Bolt Tension (TMS 402 ASD) (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04). Third and final tile of the structural member-capacity trio (v447 concrete torsion ->
> v448 glulam volume factor -> v449 masonry anchor bolt). The catalog checks CMU walls for flexure, shear, and axial
> (`cmu-wall-flexure`, `cmu-shear-wall`, `cmu-wall-axial`) but never the anchor bolt that fastens a ledger or sill to them --
> the allowable tension governed by masonry breakout or steel yield.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A headed anchor bolt in grouted masonry pulls out one
> of two ways: a masonry breakout cone or steel yielding of the bolt. TMS 402 allowable-stress design takes the tension
> capacity as the lesser of `Bab = 1.25 * Apt * sqrt(f'm)` (masonry breakout, with `Apt = pi * lbe^2` the projected area of
> the breakout cone) and `Bas = 0.6 * Ab * fy` (steel). The CMU-wall tiles size the wall, not its anchors. This adds the
> anchor-bolt tile to the existing **`calc-masonry.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v448.md.
>
> **The gap, and the evidence for it.** A `3/4 in` headed anchor (`Ab = 0.442 in^2`, `fy = 36 ksi`) embedded `4 in`
> (`lbe = 4 in`) in `1500 psi` masonry has a projected area `Apt = pi * 4^2 = 50.3 in^2`, so the masonry breakout allowable
> is `Bab = 1.25 * 50.3 * sqrt(1500) = 2,433 lb` and the steel allowable is `Bas = 0.6 * 0.442 * 36000 = 9,547 lb`. The
> masonry breakout governs at `2,433 lb` -- the anchor pulls a cone of block out long before the steel yields. No tile does
> this; the wall was designed but its anchorage was not.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified masonry strength
`f'm` and the steel yield `fy` are pressures (psi); the bolt area `Ab` is an area (in^2); the effective embedment `lbe` is a
length (in); the projected area `Apt` is an area (in^2); the allowable tensions are forces (lb). The v18/v21 contract: any
non-finite input, or a non-positive `f'm`, `fy`, `Ab`, or `lbe`, returns `{ error }`; the tile computes `Apt` from the
embedment (a full cone, reduced when near an edge is noted), reports both allowables, and takes the lesser as the governing
tension. Citation discipline (v19/v22): `GOVERNANCE.general` over the TMS 402 anchor bolt tension by name; `editionNote`
names **TMS 402 allowable-stress design, the masonry breakout `Bab = 1.25 * Apt * sqrt(f'm)` with `Apt = pi * lbe^2` (the
projected tension breakout cone, reduced for edge distance or overlap), the steel `Bas = 0.6 * Ab * fy`, and the allowable
tension as the lesser -- the strength-design coefficient `4 * Apt * sqrt(f'm)` is the alternative for LRFD**, and states that
**this returns the allowable axial tension for a headed anchor in grouted masonry, that shear (pryout) is a separate check,
that edge distance reduces `Apt`, and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `masonry-anchor-bolt` -- Masonry Headed Anchor Bolt Tension (TMS 402 ASD)

```
inputs:
  fm_psi    psi   specified masonry compressive strength f'm
  lbe_in    in    effective embedment length
  ab_in2    in^2  bolt cross-sectional (tensile) area
  fy_psi    psi   bolt yield strength

apt = pi * lbe_in^2
bab = 1.25 * apt * sqrt(fm_psi)      lb   (masonry breakout, ASD)
bas = 0.6 * ab_in2 * fy_psi          lb   (steel, ASD)
ba  = min(bab, bas)                   lb   (allowable tension)
```

**Pinned worked example (3/4 in anchor, 4 in embedment, 1500 psi, Fy 36 ksi).** `Apt = pi*16 = 50.3 in^2`;
`Bab = 1.25*50.3*sqrt(1500) = 2,433 lb`; `Bas = 0.6*0.442*36000 = 9,547 lb`; `Ba = 2,433 lb` (masonry breakout governs).
**Cross-check (deeper embedment).** Doubling the embedment to `8 in` quadruples `Apt` to `201 in^2` and raises `Bab` to
`9,733 lb`, so now the `9,547 lb` steel governs -- deep enough and the bolt, not the block, sets the limit. A non-positive
input takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry"]`, beside `cmu-wall-flexure`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, TMS 402 anchor bolts, `editionNote` naming the `Bab`/`Bas` allowables, the
`Apt = pi*lbe^2` projected area, and the ASD-vs-strength coefficient); `test/fixtures/worked-examples.json` (the masonry-
governs example + the steel-governs cross-check); `test/fixtures/compute-map.js` (`masonry-anchor-bolt` ->
`computeMasonryAnchorBolt` in `../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `cmu-wall-flexure` / `cmu-wall-axial`
/ `anchor-embedment` / `brick-veneer-anchor-spacing`); `data/search/aliases.json` ("masonry anchor bolt", "cmu anchor bolt",
"tms 402 anchor", "masonry breakout", "anchor bolt tension masonry", "headed anchor masonry", "Bab Bas", "grouted anchor
bolt", "masonry bolt capacity"); the id appended to the existing masonry renderers block in `app.js`; the `// dims:`
annotation (strengths pressure, lbe length, areas area, tensions force); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the governing switch, and the non-positive / non-finite error seams. No
new module; re-pin `calc-masonry.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the governing switch, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Bab / Bas / Ba set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (4 in embed, 1500 psi -> 2,433 lb, masonry governs).

## 5. Roadmap position

Closes the structural member-capacity trio: v447 concrete torsion, v448 glulam volume, and v449 masonry anchorage. An
anchor-bolt shear (pryout / edge) capacity and an edge-distance `Apt` reduction are the deliberate next follow-ons.
