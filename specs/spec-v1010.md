# roughlogic.com Specification v1010 -- Spring Wire Stress, Solid Height, and Buckling (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v1009.md. The design companion to
> `helical-spring-rate`.
>
> **The gap, and the evidence for it.** `helical-spring-rate` names its own omission twice: its citation says
> "Rate only (not stress, solid height, or buckling); the spring maker governs," and its note says "add wire-stress and
> buckling checks for a full design." It even computes and returns `spring_index` but never uses it for anything.
> Nothing in the catalog computed the wire stress. Alias-index, compute-map, and nearest-sibling-output checks
> confirmed no coverage (the only spring aliases route to `helical-spring-rate`, `bend-springback`, and
> `pipe-cold-spring`; `computeHelicalSpringRate` returns `{spring_rate_lb_in, spring_index, shear_modulus_psi,
> index_flag}` and no stress term). The number this settles: a rate calculation says nothing about whether the wire
> **survives** the load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive wire diameter, force, coil count, or
free length, a mean coil diameter not greater than the wire diameter, or an unknown end condition returns `{ error }`.
Input names match the sibling (`wire_diameter_in`, `mean_coil_diameter_in`) so the two tiles read as a pair. Citation
discipline (v19/v22): the Wahl correction factor, the round-wire torsional-stress relation, the Shigley end-condition
solid-height table, and the absolute-stability slenderness limit by name (Machinery's Handbook / Shigley),
`GOVERNANCE.general`; the note states that the ALLOWABLE stress by material, wire size, and static-versus-cyclic duty
is the spring maker's, and that fatigue life, set removal, and surging are not covered.

## 2. The tile

### 2.1 `spring-wire-stress` -- Spring Wire Stress (Wahl), Solid Height, and Buckling

```
inputs:
  wire_diameter_in        wire diameter d (in)
  mean_coil_diameter_in   mean coil diameter D = OD - d (in)
  force_lb                spring force F (lb)
  total_coils             total coils Nt
  free_length_in          free length L0 (in)
  end_type                squared-ground | squared | plain-ground | plain

spring_index         = D / d
wahl_factor          = (4C - 1)/(4C - 4) + 0.615/C
tau_uncorrected_psi  = 8 F D / (pi d^3)          [T = F D/2 over J/c = pi d^3/16]
tau_psi              = wahl_factor x tau_uncorrected_psi
solid_height_in      = Nt d (ground ends) | (Nt + 1) d (unground)
max_deflection_in    = L0 - solid_height_in
slenderness          = L0 / D                    [stable under 5.26, squared-and-ground]
```

**Derivation check.** Torsion in the wire is `T = F D/2`; for round wire the polar section modulus is `J/c = pi d^3/16`,
so `tau = T/(J/c) = 8 F D/(pi d^3)`. The Wahl factor corrects that for wire curvature (the inner fiber is critical) plus
direct transverse shear. It is pinned against the standard tabulated values: **1.4038** at C = 4, **1.2525** at C = 6,
**1.1840** at C = 8, **1.1194** at C = 12 -- all matching published tables, and the reason an index of 4-12 is the
practical range.

**Pinned worked example.** d = 0.080 in, D = 0.75 in, F = 5 lb, Nt = 10, L0 = 2.0 in, squared-and-ground:
`C = 9.375`; `Kw = 36.5/33.5 + 0.0656 = ` **1.15515**; `tau_unc = 8 x 5 x 0.75/(pi x 0.080^3) = ` **18,651 psi**;
`tau = ` **21,545 psi**; `Ls = 10 x 0.080 = ` **0.80 in**, leaving **1.20 in** of travel; `L0/D = 2.67`, well under
5.26. Cross-check: unground ends give `Ls = 11 x 0.080 = ` **0.88 in**, and at `L0 = 5 in` the slenderness is
**6.667**, over the limit, so the spring needs a rod or bore.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic", "machinist"]`, beside `helical-spring-rate`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (four assumptions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the unground/over-slender cross-check);
`test/fixtures/compute-map.js` (`spring-wire-stress` -> `computeSpringWireStress`);
`scripts/related-tiles.mjs` (-> `helical-spring-rate` / `bolt-stretch` / `driveshaft-crit`);
`data/search/aliases.json` (5 collision-checked search aliases plus 4 question-corpus phrases), then
`node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in `MECHANIC_RENDERERS`,
and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above the compute;
a `bounds-fuzzer.test.js` block pinning both examples, the four tabulated Wahl values and their monotonic fall, the
end-condition solid heights, the slenderness trip, the bottoms-out case, force linearity, and the error seams;
regenerated v14 corpus + tile-index + citation-strings. Home tile count 1,458 -> 1,459.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
worked-examples runner; render + output read to the value (0.080 in wire, 0.75 in coil, 5 lb -> Kw 1.155,
21,545 psi, 0.80 in solid).

## 5. Roadmap position

Completes the helical-spring pair: rate (`helical-spring-rate`) and now stress, travel, and stability. Serves the
millwright, machine builder, and machinist. Deliberately the geometry-and-stress screen; the permissible stress by
material and duty, fatigue life, set removal, and surging remain the spring maker's. Third tile in a row landed by
reading an existing tile's self-declared limitations rather than by discovery sweep -- see spec-v1008 and spec-v1009.
