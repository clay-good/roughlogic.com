# roughlogic.com Specification v267 -- Bolted Joint Design Strength: Bolt Shear + Bearing/Tearout (AISC 360 §J3) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v266..v268 (the AISC 360 steel-connection trio). This spec is the middle
> limit state: the design strength of a *single bolt in a single hole* -- the smaller of the bolt shearing off (§J3.6) and
> the plate tearing or crushing at the hole (§J3.10). It is the number the eccentric-group resultant of v266 gets checked
> against, and the per-bolt value a joint's total capacity is built from.)**
> In-scope catalog expansion under the spec-v106 trades-only charter. `bolt-group-eccentric` (v266) finds the force on the
> worst bolt; this tile finds what that bolt and its hole can actually take. The catalog has fillet- and groove-weld
> strengths (`fillet-weld-strength`, `groove-weld-strength`, both AISC 360 §J2) but no *bolt* strength -- neither the shear
> rupture of the fastener nor the bearing/tearout of the connected material, the two limit states AISC §J3 pairs at every
> hole. Adds one tile to the **`calc-steel.js`** Group E cluster; no new group, module, trade, or dependency. Inherits
> spec.md through spec-v266.md.
>
> **The gap, and the evidence for it.** A bolt in shear can fail two independent ways, and the joint is governed by the
> smaller. The fastener shears off: `Rn = Fnv x Ab` (§J3.6), where `Ab` is the nominal bolt area and `Fnv` the nominal
> shear stress from Table J3.2 -- `54 ksi` for a Group A / A325 bolt with threads in the shear plane (the common "N"
> condition), rising to `68 ksi` threads-excluded ("X") and to `68 / 84 ksi` for Group B / A490. Or the plate tears out to
> the edge / crushes at the hole: `Rn = 1.2 lc t Fu <= 2.4 d t Fu` per bolt (§J3.10, deformation a design consideration),
> where `lc` is the clear distance in the line of force (`le - dh/2` to an edge, `s - dh` between holes), `t` the ply
> thickness, `d` the bolt diameter, `dh` the hole diameter, and `Fu` the tensile strength of the *connected material*. Both
> take `phi = 0.75` (LRFD) / `Omega = 2.00` (ASD). A 3/4 in A325-N bolt in a 1/2 in A36 plate at a 1.5 in edge distance
> shears at `phi Rn = 17.9 kip` but tears out at `28.5 kip`, so the bolt governs -- and the reason a designer computes both
> is that thin plate, a short edge distance, or a high-strength bolt flips which one wins, and getting it wrong is how a
> connection that "penciled out on bolt shear" tears out in service.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bolt diameter `d`, the
ply thickness `t`, the edge distance `le`, the bolt spacing `s`, and the hole diameter `dh` are lengths (in); the bolt
area `Ab` is a length squared (in^2); the nominal shear stress `Fnv` and the connected-material tensile strength `Fu` are
stresses (ksi); the number of shear planes `ns` is a dimensionless integer; the clear distance `lc`, every nominal `Rn`,
and every design `phi Rn` / allowable `Rn/Omega` are a length and forces (kip). The v18/v21 contract: any non-finite
input, a diameter, thickness, area, `Fnv`, or `Fu` at or below zero, an edge distance below zero, or a hole diameter not
larger than the bolt diameter (a hole must clear the bolt), returns `{ error }`; the interior-bolt tearout branch is only
reported when a spacing `s > 0` is supplied. Citation discipline (v19/v22): `GOVERNANCE.general` over the bolt shear and
bearing/tearout limit states by name; `editionNote` names **AISC 360 §J3.6 bolt shear rupture (`Rn = Fnv Ab`, `ns` shear
planes) with the Table J3.2 nominal shear stresses (`Fnv = 54 ksi` Group A/A325 threads-included "N", `68` threads-
excluded "X"; `68 / 84 ksi` Group B/A490 N/X) and §J3.10 bearing/tearout (renumbered §J3.11 in AISC 360-22, coefficients unchanged) (`Rn = 1.2 lc t Fu <= 2.4 d t Fu`, deformation a
design consideration) with `lc = le - dh/2` at an edge and `s - dh` between holes, at `phi = 0.75` / `Omega = 2.00`**,
defaults to a **3/4 in A325-N bolt (`Ab = 0.4418 in^2`, `Fnv = 54 ksi`), a standard hole (`dh = d + 1/16 in` up to a 7/8
in bolt), single shear (`ns = 1`), and `Fu = 58 ksi` (A36 plate)**, and states that **this is the strength of *one bolt at
one hole* -- the user multiplies by the bolt count for the joint, applies the group-shear and slip/tension limit states
separately, and confirms the standard-hole and deformation-considered assumptions; the `2.4 d t Fu` upper bound is the
bearing cap and the `1.2 lc t Fu` term the tearout limit, whichever is smaller; and this is a design aid, not a substitute
for a licensed engineer's connection design** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `bolt-shear-bearing` -- Bolt Shear + Bearing/Tearout Design Strength (AISC §J3)

```
inputs:
  d_in       in    bolt diameter d (default 0.75)
  ab_in2     in^2  nominal bolt area Ab (default 0.4418, a 3/4 in bolt)
  fnv_ksi    ksi   nominal bolt shear stress from Table J3.2 (default 54, A325-N)
  nplanes    -     number of shear planes ns (default 1, single shear)
  t_in       in    connected ply thickness t (default 0.5)
  fu_ksi     ksi   tensile strength of the connected material (default 58, A36)
  le_in      in    edge distance in line of force le (default 1.5)
  dh_in      in    hole diameter dh (default d + 1/16)
  s_in       in    bolt spacing (pitch) in line of force s (optional, 0 = skip interior branch)

; bolt shear rupture, J3.6
Rn_shear    = nplanes * fnv_ksi * ab_in2
; bearing/tearout at the hole, J3.10 (deformation a design consideration)
bearing_cap = 2.4 * d_in * t_in * fu_ksi           ; per-bolt bearing upper bound
lc_edge     = le_in - dh_in/2                        ; clear distance to the edge
Rn_edge     = min(1.2 * lc_edge * t_in * fu_ksi, bearing_cap)
lc_int      = (s_in > 0) ? s_in - dh_in : -          ; clear distance to the adjacent hole
Rn_int      = (s_in > 0) ? min(1.2 * lc_int * t_in * fu_ksi, bearing_cap) : -
; governing per-bolt design strength (edge bolt), LRFD phi = 0.75 / ASD Omega = 2.00
Rn_gov      = min(Rn_shear, Rn_edge)
phiRn       = 0.75 * Rn_gov
Rn_asd      = Rn_gov / 2.00
```

**Pinned worked example (a 3/4 in A325-N bolt, 1/2 in A36 plate, single shear, 1.5 in edge).** `d = 0.75`,
`Ab = 0.4418 in^2`, `Fnv = 54 ksi`, `ns = 1`, `t = 0.5`, `Fu = 58 ksi`, `le = 1.5`, standard hole `dh = 0.8125 in`. Bolt
shear: `Rn = 1 x 54 x 0.4418 = 23.86 kip`. Bearing cap `2.4 x 0.75 x 0.5 x 58 = 52.2 kip`. Edge tearout: clear distance
`lc = 1.5 - 0.8125/2 = 1.094 in`, `1.2 x 1.094 x 0.5 x 58 = 38.1 kip` (below the `52.2` cap), so `Rn_edge = 38.1 kip`.
Governing nominal `min(23.86, 38.1) = 23.86 kip` (bolt shear), so `phi Rn = 0.75 x 23.86 = ` **17.9 kip** design (LRFD)
and `Rn/Omega = 23.86 / 2.00 = ` **11.9 kip** allowable (ASD) -- the value the AISC Manual bolt tables print for a 3/4 in
A325-N bolt in single shear, and the number the v266 eccentric-group resultant (`15.1 kip`) is checked against (it passes,
16% reserve). **Cross-check (an interior bolt at a 3 in pitch, and thinner plate).** Add `s = 3 in`: interior clear
distance `lc = 3 - 0.8125 = 2.19 in`, `1.2 x 2.19 x 0.5 x 58 = 76.1 kip`, now above the `52.2 kip` bearing cap, so the
interior hole is governed by *bearing* at `52.2 kip` -- still above bolt shear, so the joint stays bolt-shear-governed.
Now drop the plate to `t = 1/4 in` A36: bearing cap `26.1 kip`, edge tearout `1.2 x 1.094 x 0.25 x 58 = 19.0 kip`, so
`min(23.86, 19.0) = 19.0 kip` and *tearout* now governs (`phi Rn = 14.3 kip`) -- the flip the tile exists to catch. The
`dh <= d` (hole does not clear the bolt), non-finite, and below-range error seams bracket the strengths.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the bolt shear and bearing/tearout limit states, `editionNote` naming §J3.6 `Rn = Fnv Ab`
with the Table J3.2 `Fnv` values, §J3.10 `1.2 lc t Fu <= 2.4 d t Fu` with the `lc` edge/interior definitions, the
`phi = 0.75` / `Omega = 2.00` factors, the standard-hole and one-bolt-at-one-hole scope, and the design-aid caveat);
`test/fixtures/worked-examples.json` (the single-shear edge-bolt example + the interior/thin-plate cross-check);
`test/fixtures/compute-map.js` (`bolt-shear-bearing` -> `computeBoltShearBearing` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `bolt-group-eccentric` / `fillet-weld-strength` / `steel-beam-shear`);
`data/search/aliases.json` ("bolt shear strength", "bolt bearing", "bolt tearout", "AISC J3", "Fnv bolt", "A325 bolt
capacity", "edge distance tearout", "how much shear per bolt", "bolt design strength", "single shear double shear"); the
id appended to the `STEEL_RENDERERS["bolt-shear-bearing"]=` block at the file end of `app.js`'s steel bundle; the
`// dims:` annotation (`d_in`/`t_in`/`le_in`/`dh_in`/`s_in` length, `ab_in2` length^2, `fnv_ksi`/`fu_ksi` pressure,
`nplanes` dimensionless, strengths force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the shear / bearing-cap / edge-tearout / interior-tearout intermediates, the governing selection and its
flip when the plate thins, and the error seams (non-finite, `d_in <= 0`, `ab_in2 <= 0`, `fnv_ksi <= 0`, `t_in <= 0`,
`fu_ksi <= 0`, `le_in < 0`, `dh_in <= d_in`). Bump the `calc-steel.js` size in the `check:module-sizes` allowlist if the
gate flags it (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block asserting both limit states, the governing selection and its flip, and the error
seams); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit
(the bolt-shear / bearing-cap / tearout / governing / phi-Rn / ASD stack wraps on a phone); render-no-nan + a11y sweep,
output read to the value (3/4 in A325-N, 1/2 in A36, single shear -> governing 17.9 kip LRFD, bolt shear).

## 5. Roadmap position

The center of the steel-connection batch (v266..v268): it turns the eccentric-group resultant (v266) into a pass/fail and
supplies the per-bolt value the base-plate anchor check (v268) and any future joint tile builds on. A slip-critical
serviceability check (§J3.8, `Rn = mu Du hf Tb ns`), a combined shear-plus-tension bolt interaction (§J3.7), block-shear
rupture of the connected element (§J4.3), and a double-shear / filler-plate extension are the deliberate next follow-ons.
