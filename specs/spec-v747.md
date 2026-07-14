# roughlogic.com Specification v747 -- Solid Shaft Diameter for an Allowable Torsion (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v746.md. Explore sweep #14 (entry 1).
>
> **The gap, and the evidence for it.** The `shaft-torsion` tile runs the torsion relations forward: from a diameter it
> returns the shear stress and twist. The design question is the inverse -- **the minimum solid-shaft diameter that keeps
> the shear stress within an allowable**. For a solid shaft `tau = 16 T / (pi d^3)`, so
> `d = (16 T / (pi tau_allow))^(1/3)`. The number this settles: a **12,000 lb-in** torque at an **8,000 psi** allowable
> needs about a **1.97 in** shaft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `shaft-torsion`
sibling: the torque is `M L^2 T^-2` (lb-in), the allowable stress and shear modulus are `M L^-1 T^-2` (psi), the length
and returned diameter are `L` (in), the polar moment is `L^4`, and the twist is dimensionless (deg). It reuses the
sibling's solid-shaft torsion relation, solved for the diameter. The v18/v21 contract: any non-finite input, a
non-positive torque, or a non-positive allowable stress returns `{ error }`. Citation discipline (v19/v22): the torsion
relation solved for the diameter, `GOVERNANCE.general` matching the sibling; the note states that stress falls with the
**cube of the diameter** (round up to a stock size), that the allowable should already include the **factor of safety**,
that this sizes for **stress only** (check the angle of twist -- returned with a length and G -- against the service
limit), and that it is **pure torsion** with no bending, axial load, or keyway/shoulder stress concentration.

## 2. The tile

### 2.1 `shaft-diameter-for-torsion` -- Solid Shaft Diameter for an Allowable Torsion

```
inputs:
  T_lbin          M L^2 T^-2    torque (lb-in, > 0)
  tau_allow_psi   M L^-1 T^-2   allowable shear stress (psi, > 0)
  L_in            L             length for twist (in, optional)
  G_psi           M L^-1 T^-2   shear modulus (psi, default 11.5e6 steel)

d_in     = (16 x T_lbin / (pi x tau_allow_psi))^(1/3)
J_in4    = pi x d_in^4 / 32
theta    = T_lbin x L_in / (J_in4 x G_psi)   (when L and G given)
```

**Pinned worked example.** T = 12,000 lb-in, tau_allow = 8,000 psi:
`d = (16 x 12000 / (pi x 8000))^(1/3) = (7.639)^(1/3) = ` **1.97 in**. Feeding 1.97 in back through `shaft-torsion` (solid)
returns an 8,000 psi shear stress, the allowable. Halving the allowable to 4,000 psi grows the shaft to 2.48 in (the cube
root of 2).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["mechanic","machinist","construction"]`) placed beside `shaft-torsion` (Group E
is not exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (torsion relation solved for the
diameter, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`shaft-diameter-for-torsion` -> `computeShaftDiameterForTorsion`);
`scripts/related-tiles.mjs` (-> `shaft-torsion` / `motor-shaft-torque` / `hp-from-torque`); `data/search/aliases.json` (5
collision-checked question aliases: "shaft diameter for torsion", "size shaft for torsion", ...); the calc-construction
`CONSTRUCTION_RENDERERS` map entry via the shared `_simpleRenderer` factory (four number fields) and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeShaftTorsion` (solid) across a torque/allowable sweep, the twist match with a length and G, the
lower-allowable-bigger-shaft and more-torque-bigger-shaft monotonicity, and the error seams. The calc-construction.js gzip
cap (132000 B) holds. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,195 -> 1,196.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1.97 in for a 12,000 lb-in
torque at an 8,000 psi allowable).

## 5. Roadmap position

Pairs the forward torsion tile (`shaft-torsion`, stress from the diameter) with its inverse (the solid diameter for an
allowable), the two halves of the shaft-sizing question. Opens Explore sweep #14; further Group E structural-mechanics
growth stays evidence-driven.
