# roughlogic.com Specification v291 -- Wood Tension Member Parallel to Grain (NDS 3.8) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v290..v292 (the NDS wood-member depth trio -- bearing (v290),
> tension parallel to grain (this spec), combined bending-plus-axial (v292)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog checks wood in compression
> (`column-buckling-wood`), bending, and shear, but has no tension-parallel-to-grain check -- a truss bottom chord, a
> collector, or a hanger where the net section at a bolt hole and the tension design value govern. Adds one tile to the
> existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v290.md.
>
> **The gap, and the evidence for it.** NDS 3.8.1 checks tension parallel to grain as `ft = T/An <= Ft'`, where `T` is the
> tension force, `An` the net area (gross area less the fastener holes at the section), and `Ft'` the reference tension
> value adjusted by the applicable factors -- most importantly the load-duration factor `CD` and the size factor `CF`. For
> a 2x6 Douglas Fir-Larch bottom chord (`Ft = 575 psi`, `CF = 1.3` for a 2x6 in tension, so `Ft' = 748 psi` at `CD = 1.0`)
> carrying 3,000 lb through a single 3/4 in bolt, the net area is `1.5 x 5.5 - 0.75 x 1.5 = 7.125 in^2`, the stress is
> `3,000/7.125 = 421 psi`, and the demand/capacity is `0.56` -- the bolt hole removing 14% of the section is exactly what a
> gross-area estimate misses. The compression tile handles the strut; this tile handles the tie.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The tension force `T` is a
force (lb); the member width `b`, depth `d`, and hole diameter `dh` are lengths (in); the number of holes at the section `nh`
is a dimensionless count; the gross and net areas are areas (in^2); the reference and adjusted tension values `Ft`, `Ft'`
and the load-duration `CD` and size `CF` factors combine to a stress and dimensionless factors; the applied stress `ft` is a
stress (psi) and the demand/capacity ratio is dimensionless. The v18/v21 contract: any non-finite input, a force/dimension/
value at or below zero, or a hole pattern that removes the entire section (`An <= 0`) returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the NDS 3.8 tension provisions by name; `editionNote` names **the NDS 2018
3.8.1 tension check `ft = T/An <= Ft'`, the net area `An = b d - nh dh b`, and the adjusted value `Ft' = Ft x CD x CF`
(with the other applicable factors)**, and states that **this checks tension parallel to grain on the net section -- it
takes the reference `Ft` and the entered `CD` and `CF` (the user supplies the remaining `CM`, `Ct`, `Ci` if they apply),
deducts holes in a single transverse line (no staggered-row chain), and does not cover perpendicular-to-grain tension
(avoid it), the fastener/connection yield (`wood-bolt-connection`), or the row/group tear-out; and this is a design aid,
not a substitute for the engineer of record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wood-tension-member` -- Wood Tension Member Parallel to Grain (NDS 3.8)

```
inputs:
  T_lb    lb    tension force
  b_in    in    member width (thickness)
  d_in    in    member depth
  dh_in   in    fastener-hole diameter (0 if none)
  nh      -     holes across the section
  Ft_psi  psi   reference tension design value
  CD      -     load-duration factor (default 1.0)
  CF      -     size factor (default 1.0)

Ag  = b_in * d_in                          ; gross area, in^2
An  = Ag - nh * dh_in * b_in               ; net area, in^2
Ft_adj = Ft_psi * CD * CF                  ; adjusted tension value, psi
ft  = T_lb / An                            ; applied tension stress, psi
DCR = ft / Ft_adj                          ; demand/capacity
```

**Pinned worked example (a 2x6 DF-L bottom chord, 3,000 lb through one 3/4 in bolt).** `T = 3,000`, `b = 1.5`, `d = 5.5`,
`dh = 0.75`, `nh = 1`, `Ft = 575`, `CD = 1.0`, `CF = 1.3`: `Ag = 8.25 in^2`; `An = 8.25 - 1 x 0.75 x 1.5 = 7.125 in^2`;
`Ft' = 575 x 1.0 x 1.3 = 748 psi`; `ft = 3,000/7.125 = 421 psi`; `DCR = 421/748 = 0.56`. **Cross-check (a snow-load duration
and no holes).** Raise `CD` to `1.15` (snow) and remove the bolt (`nh = 0`): `An = 8.25 in^2`, `Ft' = 575 x 1.15 x 1.3 = 860 psi`,
`ft = 3,000/8.25 = 364 psi`, `DCR = 0.42` -- both the full section and the longer-duration allowable relax the ratio, the two
levers the code gives a tension member. The non-finite, non-positive, and `An <= 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the wood member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NDS 3.8 provisions, `editionNote` naming `ft = T/An`,
`An = b d - nh dh b`, `Ft' = Ft CD CF`, and the net-section, single-row-holes, not-perp-tension caveats);
`test/fixtures/worked-examples.json` (the bolted example + the snow-duration no-hole cross-check);
`test/fixtures/compute-map.js` (`wood-tension-member` -> `computeWoodTensionMember` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `wood-bolt-connection` / `column-buckling-wood` / `wood-beam-bending` /
`truss-capacity`); `data/search/aliases.json` ("wood tension member", "tension parallel to grain", "Ft prime", "bottom
chord tension", "net area wood", "NDS 3.8", "truss tension", "wood tie", "lumber tension"); the id appended to the existing
construction renderers block in `app.js`; the `// dims:` annotation (`T` force, lengths length, areas area, stresses
stress, `CD`/`CF`/`DCR` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the net-area deduction, the `Ft' = Ft CD CF` product, and the non-positive / `An <= 0` / non-finite error seams.
No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the net-area and factor-product assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `An` / `Ft'` / `ft` / `DCR`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (3,000 lb 2x6 -> 421 psi, DCR 0.56).

## 5. Roadmap position

Middle of the NDS wood-member depth batch (v290..v292) in `calc-construction.js`, adding the tension member beside bearing,
bending, shear, and compression. The beam-column interaction (v292) follows. The staggered-hole net-section chain, the
group-action/row-tear-out at bolted tension joints, and a truss-chord combined tension-plus-bending tile are the deliberate
next follow-ons once the trio lands.
