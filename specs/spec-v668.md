# roughlogic.com Specification v668 -- Thin-Wall Vessel Max Allowable Working Pressure (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E, welding / pipefitting / construction), no new module, group, or dependency. Inherits spec.md through spec-v667.md.
>
> **The gap, and the evidence for it.** Spec-v361 (`hoop-stress-thin-wall`) runs the thin-wall relation forward: given
> the pressure, diameter, and wall, it returns the hoop stress `sigma_h = P D / (2 t)` and a demand/capacity ratio
> against an allowable stress. The everyday pressure-vessel and pipe question is the inverse -- **what is the maximum
> allowable working pressure** a given wall and diameter can hold at the allowable stress, `P_max = 2 t S_allow / D`.
> The forward tile never returns it; it only reports a DCR for a pressure you already picked, so finding the MAWP means
> guessing pressures until the DCR hits 1. The number this settles: a **12 in** vessel with a **0.25 in** wall at a
> **15,000 psi** allowable holds **625 psi** (hoop-governed); the longitudinal stress is half the hoop, so the
> longitudinal limit would allow **1,250 psi** -- the hoop governs, which is why a cylinder splits along its length.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`hoop-stress-thin-wall` sibling: the wall and diameter are `L` (in), the allowable stress and the returned pressures are
`M L^-1 T^-2` (psi), and the D/t ratio is `dimensionless`. The v18/v21 contract: any non-finite input, or a
non-positive wall / diameter / allowable stress, returns `{ error }`. Citation discipline (v19/v22): the thin-wall
membrane-stress relation (Barlow / mechanics of materials) solved for the pressure, by name; the note states that
**P_max = 2 t S_allow / D is hoop-governed, the longitudinal limit is double, to size the wall for a known design
pressure instead rearrange to t_min = P D / (2 S_allow), the thin-wall formula assumes D/t >= 20, and this is a design
aid, not a substitute for a pressure-vessel code (ASME BPVC) or the engineer of record**.

## 2. The tile

### 2.1 `hoop-stress-mawp` -- Thin-Wall Vessel Max Allowable Working Pressure

```
inputs:
  t_in       in    wall thickness (> 0)
  D_in       in    diameter, mean/inner (> 0)
  S_allow    psi   allowable stress (> 0)

P_max      = 2 t S_allow / D    [psi]  (hoop-governed MAWP)
P_max_long = 4 t S_allow / D    [psi]  (= 2 x P_max; the hoop governs)
D/t                                    (thin-wall valid if >= 20)
```

**Pinned worked example (a 12 in vessel).** t = 0.25 in, D = 12 in, S_allow = 15,000 psi:
`P_max = 2 x 0.25 x 15000 / 12 = 7500 / 12 = ` **625 psi**, `P_max_long = 1,250 psi`, D/t = 48 (thin-wall valid).
Feeding 625 psi back through `hoop-stress-thin-wall` gives `sigma_h = 625 x 12 / (2 x 0.25) = ` **15,000 psi = S_allow**,
i.e. a DCR of exactly 1.0. **Cross-check (a thicker, larger shell).** t = 0.5 in, D = 24 in, S_allow = 20,000 psi:
`P_max = 2 x 0.5 x 20000 / 24 = ` **833 psi** -- doubling both the wall and the diameter leaves the ratio unchanged, and
the higher allowable lifts the pressure.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding", "pipefitting", "construction"]`, beside `hoop-stress-thin-wall`);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (thin-wall / Barlow solved for pressure, `GOVERNANCE.general`,
the note per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`hoop-stress-mawp` -> `computeHoopStressMawp` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`hoop-stress-thin-wall` / `pipe-pressure-rating` / `tank-volume` / `combined-stress-axial-bending`, and the forward tile
links back); `data/search/aliases.json` ("mawp", "max allowable working pressure", "pressure rating from wall
thickness", "minimum wall thickness for pressure", plus adjacent rows); `CONSTRUCTION_RENDERERS["hoop-stress-mawp"]` via
the module's `_simpleRenderer` factory (mirroring `hoop-stress-thin-wall`) and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the longitudinal doubling, the round-trip
through `computeHoopStressThinWall` to DCR 1, and the error seams. The Group E audit-coverage test parses only the
original `// Group E: Carpentry` block (this tile is in a later section) and asserts a lower bound, so no count bump. The
calc-construction.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 625 psi MAWP at a 0.25 in wall, 15,000 psi
allowable).

## 5. Roadmap position

Pairs the forward thin-wall tile (`hoop-stress-thin-wall`, stress from pressure) with its inverse (pressure from the
allowable stress), the two halves of the pressure-vessel sizing question. Further Group E growth stays evidence-driven.
