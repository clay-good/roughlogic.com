# roughlogic.com Specification v770 -- Helical Compression Spring Rate (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v769.md. Explore sweep #18 (entry 2).
>
> **The gap, and the evidence for it.** A mechanic or fabricator replacing or specifying a coil spring needs its **rate**
> (stiffness), and no tile computes it. The standard Machinery's Handbook / Shigley relation is `k = G d^4 / (8 D^3 Na)`,
> from the wire shear modulus `G`, wire diameter `d`, mean coil diameter `D` (= OD - d), and the number of **active** coils
> `Na`. The number this settles: a **0.080 in** hard-drawn wire, **0.75 in** mean coil, **8** active coils is **17.4 lb/in**
> (spring index 9.4). Grep confirmed no `spring rate` / `spring index` / `helical spring` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
`bolt-stretch` / `driveshaft-crit` siblings: the wire and coil diameters carry `L`, the rate `M T^-2` (lb/in), the shear
modulus `M L^-1 T^-2` (psi), and the coil count and spring index are dimensionless. The v18/v21 contract: a non-finite
input (via `_finiteGuard`), an unknown material, a non-positive wire diameter, a mean coil diameter not greater than the
wire diameter, or non-positive active coils returns `{ error }`. Citation discipline (v19/v22): the rate formula by name
(Machinery's Handbook / Shigley), `GOVERNANCE.general`, with the per-material `G` from the ASTM spring-wire standards; the
note explains that `Na` comes from the total coils by end condition, a good spring index is 4-12, and the tile gives the
rate only (not wire stress, solid height, or buckling).

## 2. The tile

### 2.1 `helical-spring-rate` -- Helical Compression Spring Rate

```
inputs:
  wire_diameter_in        wire diameter d (in, > 0)
  mean_coil_diameter_in   mean coil diameter D = OD - d (in, > d)
  active_coils            active coils Na (> 0)
  material                music-wire | hard-drawn | chrome-silicon | stainless-302 | phosphor-bronze

G            = shear modulus by material (psi)
spring_rate  = G d^4 / (8 D^3 Na)   (lb/in)
spring_index = D / d                (flag if < 4 or > 12)
```

`G` by material (psi): music wire (A228) 11.85e6, hard-drawn (A227) 11.5e6, chrome-silicon (A401) 11.2e6, stainless
302/304 (A313) 10.0e6, phosphor bronze (B159) 6.0e6.

**Pinned worked example.** d = 0.080 in, D = 0.75 in, Na = 8, hard-drawn (G = 11.5e6 psi):
`k = 11.5e6 x 0.080^4 / (8 x 0.75^3 x 8) = 471.04 / 27.0 = ` **17.45 lb/in**; spring index `D/d = ` **9.375** (good).
The rate scales as `d^4` (double the wire, 16x the rate), `1/D^3`, and `1/Na` -- all pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed with the later Group K tiles **outside the exact-count
(12) `// Group K: Mechanic` .. `// Group L` audit block** (beside `screw-conveyor-rpm`), so the audit is untouched; a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (the rate formula + per-material G, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`helical-spring-rate` ->
`computeHelicalSpringRate`); `scripts/related-tiles.mjs` (-> `bolt-stretch` / `driveshaft-crit` / `hp-from-torque`);
`data/search/aliases.json` (5 collision-checked aliases: "spring rate of a coil spring", "compression spring rate", ...);
the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory (three number fields plus a material
select defaulting to music wire) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the d^4 / 1/D^3 / 1/Na scaling laws, the material-G ratio, the spring-index flags, and the
error seams. The calc-mechanic.js gzip cap (raised to 46000 B in this spec) covers the addition. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,218 -> 1,219.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 17.45 lb/in and a 9.375
spring index for a 0.080 in hard-drawn wire, 0.75 in mean coil, 8 active coils).

## 5. Roadmap position

Adds the fundamental spring calculation to the mechanic bench alongside the fastener (`bolt-stretch`) and rotating-shaft
(`driveshaft-crit`) tiles. Continues the post-inverse forward-coverage vein (Explore sweep #18). A companion wire-stress
(Wahl-corrected) or solid-height tile is the natural next spring addition; it stays evidence-driven.
