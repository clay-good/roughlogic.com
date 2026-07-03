# roughlogic.com Specification v283 -- Steel Tension Member Yield and Rupture with Shear Lag (AISC 360 D2/D3) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.100.0; proposed 2026-07-02). Batch spec-v281..v283 (the steel members-and-connections depth trio --
> LTB (v281), block shear (v282), the tension member (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog checks steel in bending
> (`steel-beam-flexure`, `steel-beam-ltb`), shear (`steel-beam-shear`), and compression (`steel-column-capacity`), but has
> no tension-member check -- the brace, hanger, sag rod, or truss diagonal governed by yielding on the gross section or
> rupture on the reduced net section with shear lag. Adds one tile to the existing **`calc-steel.js`** module (Group E); no
> new group, trade, or dependency. Inherits spec.md through spec-v282.md.
>
> **The gap, and the evidence for it.** AISC 360 Chapter D governs axial tension by the lower of two limit states: yielding
> on the gross area, `Pn = Fy Ag` (`phi = 0.90`, `Omega = 1.67`), and rupture on the effective net area,
> `Pn = Fu Ae` with `Ae = U An` (`phi = 0.75`, `Omega = 2.00`), where `An` deducts the bolt holes and `U` is the shear-lag
> factor for a member connected through only some of its elements. For an L4x4x1/2 A36 angle (`Ag = 3.75 in^2`) bolted
> through one leg with a single line of three 3/4 in bolts, the net area is `3.75 - 0.875 x 0.5 = 3.31 in^2`, the shear-lag
> factor `U = 1 - xbar/L = 1 - 1.18/6 = 0.80`, `Ae = 2.66 in^2`, and the two limits are gross yielding at
> ASD 80.8 kip and net rupture at ASD 77.2 kip -- rupture governs, the shear-lag penalty a straight `Fy Ag` estimate would
> miss. The catalog's compression and flexure tiles never touch this; it is the missing axial-tension leg.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The gross area `Ag`, the net
and effective areas are areas (in^2); the member thickness `t`, hole diameter `dh`, connection eccentricity `xbar`, and
connection length `L` are lengths (in); the number of hole lines across the section `nh` is a dimensionless count; `Fy` and
`Fu` are stresses (ksi); `U` is the dimensionless shear-lag factor (entered, or computed from `1 - xbar/L`); the nominal,
ASD, and LRFD strengths are forces (kip). The v18/v21 contract: any non-finite input, or any area/length at or below zero,
returns `{ error }`; `U` is capped at 1.0. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 D2/D3
provisions by name; `editionNote` names **the AISC 360-22 D2 gross yielding `Pn = Fy Ag` (`phi = 0.90`/`Omega = 1.67`), D3
net rupture `Pn = Fu Ae`, `Ae = U An` (`phi = 0.75`/`Omega = 2.00`), the shear-lag factor `U = 1 - xbar/L` (Table D3.1 Case
2), and the net area `An = Ag - nh dh t`**, and states that **this covers the axial-tension yield and rupture limit states
-- it uses the entered or `1 - xbar/L` shear-lag factor (not the tabulated element-specific cases), assumes standard holes
in a single transverse line (no staggered `s^2/4g` chain), and does not check block shear (`steel-block-shear`), the
bolt/weld connection, or slenderness/`L/r` serviceability; and this is a design aid, not a substitute for the engineer of
record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-tension-member` -- Steel Tension Member Yield and Rupture (AISC 360 D2/D3)

```
inputs:
  Ag_in2   in^2   gross cross-sectional area
  Fy       ksi    yield stress
  Fu       ksi    tensile stress
  t_in     in     thickness at the holes
  dh_in    in     bolt-hole diameter (default bolt dia + 1/8)
  nh       -      hole lines across the section
  xbar_in  in     connection eccentricity (for shear lag); 0 => U=1
  L_in     in     connection length (first to last fastener)
  U_in     -      shear-lag factor override (optional)

An = Ag_in2 - nh * dh_in * t_in                  ; net area, in^2
U  = U_in ?? min(1 - xbar_in / L_in, 1.0)        ; shear-lag factor
Ae = U * An                                      ; effective net area, in^2
Pn_yield  = Fy * Ag_in2      ; ASD = /1.67 ; LRFD = 0.90 *
Pn_rupt   = Fu * Ae          ; ASD = /2.00 ; LRFD = 0.75 *
P_ASD  = min(Pn_yield/1.67, Pn_rupt/2.00) ; P_LRFD = min(0.90*Pn_yield, 0.75*Pn_rupt)
```

**Pinned worked example (an L4x4x1/2 A36 angle bolted through one leg, three 3/4 in bolts).** `Ag = 3.75`, `Fy = 36`,
`Fu = 58`, `t = 0.5`, `dh = 0.875`, `nh = 1`, `xbar = 1.18`, `L = 6`: `An = 3.75 - 1 x 0.875 x 0.5 = 3.31 in^2`;
`U = 1 - 1.18/6 = 0.803`; `Ae = 0.803 x 3.31 = 2.66 in^2`; gross yielding `Pn = 36 x 3.75 = 135 kip` (ASD 80.8, LRFD 121.5);
net rupture `Pn = 58 x 2.66 = 154 kip` (ASD 77.2, LRFD 115.8). The governing ASD capacity is `77.2 kip` and LRFD `115.8 kip`
-- rupture, not yielding, because the single connected leg draws the `U = 0.80` shear-lag penalty. **Cross-check (weld the
full section so shear lag disappears, U = 1.0).** Same angle, `U_in = 1.0`, no holes (`nh = 0`): `An = Ae = 3.75 in^2`;
rupture `Pn = 58 x 3.75 = 217.5 kip` (ASD 108.8), so yielding at ASD 80.8 kip now governs -- the limit state flips when the
connection stops reducing the section. The non-finite and non-positive-area error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching the steel member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 D2/D3 provisions, `editionNote` naming
`Pn = Fy Ag`, `Pn = Fu Ae`, `Ae = U An`, `U = 1 - xbar/L`, and the single-line-holes, entered-U, not-block-shear caveats);
`test/fixtures/worked-examples.json` (the bolted-angle rupture-governs example + the full-section yield-governs cross-check);
`test/fixtures/compute-map.js` (`steel-tension-member` -> `computeSteelTensionMember` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `steel-block-shear` / `steel-column-capacity` / `bolt-shear-bearing` / `metal-weight`);
`data/search/aliases.json` ("tension member", "steel tension", "net area", "shear lag", "effective net area", "AISC D2 D3",
"gross yielding rupture", "brace tension capacity", "U factor tension"); the id appended to the existing steel renderers
block in `app.js`; the `// dims:` annotation (areas area, lengths in, `Fy`/`Fu` stress, `nh`/`U` dimensionless, strengths
force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the min() limit-state
selection, the `U` cap and override, and the non-positive / non-finite error seams. No new module; re-pin `calc-steel.js` on
the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the limit-state-flip assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `An` / `U` / `Ae` / yield / rupture
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (L4x4x1/2 -> 77.2 kip ASD, rupture governs).

## 5. Roadmap position

Closes the steel members-and-connections depth batch (v281..v283) in `calc-steel.js`: LTB (v281), block shear (v282), and
the tension member (this tile) round out the member checks beside flexure, shear, and compression. The staggered-hole
`s^2/4g` net-area chain, the Table D3.1 element-specific shear-lag cases, and the compression member with slender elements
are the deliberate next follow-ons once the trio lands. With this batch the steel cluster covers all four axial/flexural
limit states.
