# roughlogic.com Specification v265 -- Single-Shear Bolted/Dowel Connection Lateral Design Value (NDS Yield-Limit Equations) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.91.0; was PROPOSED 2026-07-02). Batch spec-v263..v265 (the sawn-lumber design trio). This spec closes the batch with
> the connection -- the NDS yield-limit ("European Yield Model") equations that give the lateral reference design value Z
> of a single bolt or dowel in single shear. It is the crown of the trio: the member checks (v263 bending, v264 shear)
> size the wood, and this is how load actually gets from one piece of wood into the next.)**
> In-scope catalog expansion under the spec-v106 trades-only charter. The catalog computes fastener *withdrawal* (the
> `fastener-pullout` tile, `W = G^2.5 D x 1380` per inch, calc-construction.js) -- axial pull-out of a nail or screw -- but
> nothing computes a fastener's *lateral* design value, which is the load path for essentially every real wood connection
> (a bolt in a shear tab, a nail in a shear wall, a dowel in a truss heel). Lateral capacity is not a table lookup dressed
> up; it is the six-mode yield-limit calculation, and doing it by hand is exactly the kind of arithmetic this catalog
> exists to shoulder. Adds one tile beside the wood member tiles in **`calc-construction.js`** Group E; no new group,
> module, trade, or dependency. Inherits spec.md through spec-v264.md.
>
> **The gap, and the evidence for it.** A single dowel in a two-member (single-shear) joint can yield in one of six ways:
> the wood crushes under the dowel in the main member (mode `Im`) or the side member (`Is`); the dowel pivots rigidly
> (`II`); it forms one plastic hinge bearing in the main member (`IIIm`) or the side member (`IIIs`); or it forms two
> hinges (`IV`). The NDS gives a closed-form `Z` for each mode, all sharing the dowel bearing strengths
> `Fem` and `Fes` (`Fe|| = 11,200 G` parallel to grain, `Fe_perp = 6,100 G^1.45 / sqrt(D)`, blended by the Hankinson
> formula off-axis), the bolt bending yield `Fyb`, the bearing lengths `lm` and `ls`, and a diameter/angle reduction term
> `Rd`; the governing lateral value is the smallest of the six. A 1/2 in bolt through a nominal 4x main member
> (`lm = 3.5 in`) into a nominal 2x side member (`ls = 1.5 in`), both Douglas Fir-Larch (`G = 0.50`), loaded parallel to
> grain, works out to a governing `Z ~= 615 lb` in yield mode `IIIs` (one hinge, side-member bearing) -- in the band the NDS
> bolt tables print for that geometry, and a number no one is going to reproduce from six nested radicals by hand at a
> job-site table.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The dowel diameter `D`, the
main-member bearing length (dowel penetration) `lm`, and the side-member bearing length `ls` are lengths (in); the specific
gravities `Gm`, `Gs` are dimensionless; the dowel bearing strengths `Fem`, `Fes`, the bolt bending yield `Fyb`, and every
mode value `Z` are stresses and a force respectively (psi, lb); the ratios `Re = Fem/Fes`, `Rt = lm/ls`, the coefficients
`k1`, `k2`, `k3`, the angle-to-grain `theta`, the angle factor `Ktheta`, and the reduction term `Rd` are dimensionless (Rd
carries the implicit 1/length^2 that turns the mode expressions into a force, per NDS convention). The v18/v21 contract:
any non-finite input, a diameter, bearing length, specific gravity, or `Fyb` at or below zero, a specific gravity at or
above 1.0 (heavier than solid wood substance), or an angle-to-grain outside `0..90 deg`, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the NDS lateral-design-value / yield-limit provisions by name;
`editionNote` names **the single-shear yield-limit equations of NDS Table 12.3.1A (modes Im, Is, II, IIIm, IIIs, IV with
coefficients k1, k2, k3), the dowel bearing strengths `Fe|| = 11,200 G` and `Fe_perp = 6,100 G^1.45 / sqrt(D)` (NDS
12.3.3) blended by the Hankinson formula, and the reduction terms `Rd = {4, 3.6, 3.2} Ktheta` with
`Ktheta = 1 + 0.25 (theta/90)` for `1/4 in <= D <= 1 in` bolts (NDS Table 12.3.1B)**, gives `Fyb` a default of
**45,000 psi (a common bolt bending-yield strength)**, `Gm`/`Gs` a default of **0.50 (Douglas Fir-Larch / Southern Pine
band)**, and `theta` a default of **0 (load parallel to grain)**, and states that **this is the reference lateral design
value `Z` of a *single* fastener in *single shear* (two members) before the adjustment factors of NDS Table 11.3.1 (`CD`,
`CM`, `Ct`, group action `Cg`, geometry `C_delta`, end grain `Ceg`, etc.) and before any group/row multiplication -- the
user applies those; the `1/4..1 in` diameter band selects the bolt reduction terms and excludes small-dowel nails/screws
and the local-stress/spacing/end-and-edge-distance geometry checks; and this is a design aid, not a substitute for the
engineer of record** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wood-bolt-connection` -- Single-Shear Bolted/Dowel Lateral Design Value (NDS Yield-Limit Z)

```
inputs:
  d_in      in    dowel (bolt) diameter D (1/4 to 1 in for the bolt Rd terms)
  lm_in     in    main-member dowel bearing length (thickness) lm
  ls_in     in    side-member dowel bearing length (thickness) ls
  gm        -     main-member specific gravity Gm (default 0.50)
  gs        -     side-member specific gravity Gs (default 0.50)
  fyb_psi   psi   dowel bending yield Fyb (default 45000)
  theta_deg deg   maximum angle of load to grain, 0..90 (default 0)

; dowel bearing strengths, Hankinson-blended for angle to grain
Fe(G) at theta:  Fpar = 11200*G ;  Fperp = 6100*G^1.45 / sqrt(d_in)
                 t = theta_deg*pi/180
                 Fe = Fpar*Fperp / (Fpar*sin(t)^2 + Fperp*cos(t)^2)
Fem = Fe(gm) ;   Fes = Fe(gs)
Re  = Fem/Fes ;  Rt = lm_in/ls_in
Ktheta = 1 + 0.25*(theta_deg/90)
k1 = ( sqrt(Re + 2*Re^2*(1+Rt+Rt^2) + Rt^2*Re^3) - Re*(1+Rt) ) / (1+Re)
k2 = -1 + sqrt( 2*(1+Re) + (2*fyb_psi*(1+2*Re)*d_in^2) / (3*Fem*lm_in^2) )
k3 = -1 + sqrt( 2*(1+Re)/Re + (2*fyb_psi*(2+Re)*d_in^2) / (3*Fem*ls_in^2) )

Z_Im   = d_in*lm_in*Fem / (4.0*Ktheta)
Z_Is   = d_in*ls_in*Fes / (4.0*Ktheta)
Z_II   = k1*d_in*ls_in*Fes / (3.6*Ktheta)
Z_IIIm = k2*d_in*lm_in*Fem / ((1+2*Re)*3.2*Ktheta)
Z_IIIs = k3*d_in*ls_in*Fem / ((2+Re)*3.2*Ktheta)
Z_IV   = (d_in^2 / (3.2*Ktheta)) * sqrt( 2*Fem*fyb_psi / (3*(1+Re)) )
Z      = min(Z_Im, Z_Is, Z_II, Z_IIIm, Z_IIIs, Z_IV)   ; governing lateral design value, lb
```

**Pinned worked example (a 1/2 in bolt, 4x main into 2x side, Douglas Fir-Larch, load parallel to grain).** `D = 0.5 in`,
`lm = 3.5 in`, `ls = 1.5 in`, `Gm = Gs = 0.50`, `Fyb = 45,000 psi`, `theta = 0`: parallel bearing
`Fem = Fes = 11,200 x 0.50 = 5,600 psi`, so `Re = 1.0`, `Rt = 3.5/1.5 = 2.333`, `Ktheta = 1.0`. Coefficients:
`k1 = (sqrt(1 + 2(8.778) + 5.444) - 3.333)/2 = (sqrt(24.0) - 3.333)/2 = (4.899 - 3.333)/2 = 0.783`;
`k2 = -1 + sqrt(4 + (2 x 45,000 x 3 x 0.25)/(3 x 5,600 x 12.25)) = -1 + sqrt(4 + 0.328) = 1.080`;
`k3 = -1 + sqrt(4 + (2 x 45,000 x 3 x 0.25)/(3 x 5,600 x 2.25)) = -1 + sqrt(4 + 1.786) = 1.405`. Modes:
`Z_Im = 0.5 x 3.5 x 5,600 / 4 = ` **2,450 lb**; `Z_Is = 0.5 x 1.5 x 5,600 / 4 = ` **1,050 lb**;
`Z_II = 0.783 x 0.5 x 1.5 x 5,600 / 3.6 = ` **913 lb**;
`Z_IIIm = 1.080 x 0.5 x 3.5 x 5,600 / (3 x 3.2) = 10,588 / 9.6 = ` **1,103 lb**;
`Z_IIIs = 1.405 x 0.5 x 1.5 x 5,600 / (3 x 3.2) = 5,903 / 9.6 = ` **615 lb**;
`Z_IV = (0.25/3.2) x sqrt(2 x 5,600 x 45,000 / 6) = 0.0781 x 9,165 = ` **716 lb**. The governing value is the smallest,
`Z = 615 lb` in **mode IIIs** (a single plastic hinge with bearing in the thin side member) -- the mode that almost always
governs a bolt into a thin side plate, and a value in the band the NDS bolt tables print for this exact geometry.
**Cross-check (load perpendicular to grain, the Hankinson + Ktheta seam).** Hold everything and set `theta = 90`:
`Fperp = 6,100 x 0.5^1.45 / sqrt(0.5) = 6,100 x 0.3660 / 0.7071 = 3,158 psi`, so `Fem = Fes = 3,158 psi` (Hankinson at 90
deg returns `Fperp` exactly), `Ktheta = 1 + 0.25(90/90) = 1.25`. Both the smaller bearing strength and the larger `Rd`
push `Z` down -- the governing value falls to `Z ~= 331 lb`, still in mode IIIs, the expected drop for
cross-grain bolt bearing, and the seam the fuzzer pins (theta = 0 must return `Fperp`-free parallel bearing; theta = 90
must return `Fperp` and `Ktheta = 1.25`). The `G >= 1.0`, `theta` out of `0..90`, and non-positive-dimension error paths
bracket the six-mode minimum.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the NDS lateral-design-value / yield-limit provisions, `editionNote` naming the six single-
shear modes of Table 12.3.1A with `k1/k2/k3`, the `Fe||`/`Fe_perp` dowel bearing strengths of 12.3.3 and the Hankinson
blend, the `Rd = {4, 3.6, 3.2} Ktheta` reduction terms for `1/4..1 in` bolts of Table 12.3.1B, the `Fyb`/`G`/`theta`
defaults, the reference-value-before-adjustment-factors scope with the `CD`/`CM`/`Cg`/`C_delta` and geometry/spacing
exclusions, and the design-aid caveat); `test/fixtures/worked-examples.json` (the parallel-to-grain 1/2 in bolt example +
the perpendicular-to-grain cross-check); `test/fixtures/compute-map.js` (`wood-bolt-connection` ->
`computeWoodBoltConnection` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `fastener-pullout` /
`wood-beam-shear` / `deck-ledger-fasteners`); `data/search/aliases.json` ("bolt connection", "yield limit", "European
yield model", "NDS Z value", "lateral design value", "dowel bearing", "single shear bolt", "how much load per bolt", "wood
bolt capacity", "connection design wood"); the id appended to the `CONSTRUCTION_RENDERERS["wood-bolt-connection"]=` block
at the file end of `app.js`'s construction bundle; the `// dims:` annotation (`d_in`/`lm_in`/`ls_in` length, `gm`/`gs`
dimensionless, `fyb_psi` pressure, `theta_deg` dimensionless, each `Z` force); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, every one of the six mode values in the parallel example, the
governing-mode selection, and the error seams (non-finite, `d_in <= 0`, `lm_in <= 0`, `ls_in <= 0`, `gm/gs <= 0` or
`>= 1`, `fyb_psi <= 0`, `theta_deg < 0` or `> 90`) plus the `theta = 0` parallel and `theta = 90` perpendicular bearing-
strength identities. Bump the `calc-construction.js` size in the `check:module-sizes` allowlist if the gate flags it
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block asserting all six modes and the governing selection, the error and Hankinson seams);
`npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the six
mode-Z lines plus the governing value wrap on a phone -- the longest output stack in the trio); render-no-nan + a11y
sweep, output read to the value (1/2 in bolt, DF-L, parallel -> governing Z 615 lb in mode IIIs).

## 5. Roadmap position

Closes the sawn-lumber design trio (v263..v265) and, with the member checks, gives the catalog a complete wood load path:
bending (`wood-beam-bending`), shear at a notch (`wood-beam-shear`), compression (`column-buckling-wood`), and now the
connection that ties members together. The single-shear/single-fastener reference value is the base case; a double-shear
(three-member) form, the group-action factor `Cg` for a row of bolts, the spacing / end-distance / edge-distance geometry
factor `C_delta`, small-dowel (nail/screw) reduction terms, and a lag-screw withdrawal-plus-lateral companion are the
deliberate next follow-ons. With this trio landed the wood cluster stands beside the steel-member (v254..v256), reinforced-
concrete (v257..v259), and geotechnical (v260..v262) clusters in Group E.
