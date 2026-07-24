# roughlogic.com Specification v1015 -- Gear Tooth Bending Stress, Lewis (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-24). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v1014.md. The design companion to
> `spur-gear-geometry`.
>
> **The gap, and the evidence for it.** `spur-gear-geometry` names its own omission: its citation says it "returns the
> geometry only; it does not check tooth strength, backlash, or undercutting." Nothing in the catalog computed the
> bending stress in a gear tooth. Alias-index, compute-map, and nearest-sibling-output checks confirmed no coverage
> (the gear tiles are `spur-gear-geometry`, `gear-identification`, `gear-chordal-thickness`, `gear-cascade`, and
> `gear-mph-rpm`, all geometry/kinematics; none returns a stress term). The number this settles: geometry says nothing
> about whether the tooth **survives** the transmitted load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive transmitted load, diametral pitch, or
face width, a tooth count below the Lewis floor (6), or an unknown tooth system returns `{ error }`. Citation
discipline (v19/v22): the Lewis beam-strength equation and the per-system closed-form factors by name (Wilfred Lewis
1892 / Shigley), `GOVERNANCE.general`; the note states that this is the STATIC Lewis stress, that the Barth velocity
factor and the AGMA 2001 geometry (J) and load-distribution factors are not modeled, and that the material endurance
limit and the gear maker govern.

## 2. The tile

### 2.1 `gear-tooth-bending-stress` -- Gear Tooth Bending Stress (Lewis)

```
inputs:
  transmitted_load_lb     tangential (transmitted) load Wt at the pitch line (lb)
  diametral_pitch_1_in    diametral pitch Pd (teeth per inch)
  face_width_in           face width F (in)
  number_of_teeth         tooth count T
  tooth_system            20-full-depth | 14.5-full-depth | 20-stub

compute:
  y  = a - b/T            Lewis form factor (circular-pitch convention), a,b per system:
                            20-full-depth   0.154, 0.912
                            14.5-full-depth 0.124, 0.684
                            20-stub         0.175, 0.841
  pc = pi / Pd            circular pitch (in)
  sigma = Wt / (F pc y)   bending stress at the weakest root section (psi)
  Y  = pi y               diametral-pitch form factor; sigma = Wt Pd / (F Y) is identical

outputs:
  bending_stress_psi, circular_pitch_in, lewis_form_factor_y, lewis_Y_diametral, undercut_flag, note
```

**Worked example (pinned).** Wt = 500 lb, Pd = 8, F = 1.5 in, T = 20, 20 deg full depth. y = 0.154 - 0.912/20 =
0.1084; pc = pi/8 = 0.392699 in; sigma = 500 / (1.5 x 0.392699 x 0.1084) = 7,830.5 psi. Cross-check by the diametral
form: Y = pi y = 0.340549, Wt Pd/(F Y) = 4000 / 0.510824 = 7,830.5 psi -- the two forms agree, which the bounds-fuzzer
pins as the tile's own internal proof.

## 3. Wiring

`calc-mechanic.js` (compute + `_simpleRenderer`, `MECHANIC_RENDERERS["gear-tooth-bending-stress"]`, `GEAR_TOOTH_SYSTEMS`
map), `tools-data.js`, `tile-meta.js`, `app.js` declare list, `test/fixtures/compute-map.js`,
`test/fixtures/worked-examples.json`, `scripts/related-tiles.mjs`, `data/search/aliases.json` (+ regenerated shards),
`test/unit/bounds-fuzzer.test.js`, and the regenerated corpus / tile-index / derivations artifacts.
