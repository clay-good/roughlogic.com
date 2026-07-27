# roughlogic.com Specification v1016 -- Mononobe-Okabe Seismic Active Earth Pressure (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1015.md. The seismic companion to
> `coulomb-earth-pressure` and `retaining-wall-stability`.
>
> **The gap, and the evidence for it.** `retaining-wall-stability` names its own omission: its citation says it "does
> not apply seismic (Mononobe-Okabe) pressure or a sloped or submerged backfill." spec-v262 §follow-on lists four
> items -- a gravity-wall variant, passive-toe credit, **a Mononobe-Okabe seismic-pressure increment**, and a
> sloped-backfill case. The sloped-backfill, submerged, at-rest, and Coulomb siblings have all since landed; the
> seismic increment was the last unbuilt item. A repo-wide search for `mononobe` returned three hits, all of them
> prose saying the tile does not exist. Alias-index, compute-map, and nearest-sibling-output checks confirmed no
> coverage: the earth-pressure family (`lateral-earth-pressure`, `at-rest-earth-pressure`,
> `submerged-earth-pressure`, `sloped-backfill-earth-pressure`, `coulomb-earth-pressure`,
> `boussinesq-surcharge-wall`) is entirely static, and `seismic-base-shear` is a building-inertia tile that never
> touches retained soil. The number this settles: how much harder, and how much higher, the backfill pushes on a wall
> during the design earthquake.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive unit weight or height, a friction
angle outside (0, 50), a wall friction outside [0, phi], a batter outside [0, 40), a backfill slope outside [0, phi),
a `kh` outside [0, 1), a `kv` outside (-1, 1), or a seismic/geometry combination for which no active wedge exists all
return `{ error }`. Citation discipline (v19/v22): Mononobe-Okabe (Okabe 1926; Mononobe and Matsuo 1929) and Seed and
Whitman (1970) by name, as compiled in NAVFAC DM-7.02, FHWA earth-retaining-structures guidance, and Kramer,
*Geotechnical Earthquake Engineering*; `GOVERNANCE.general`; the note states the pseudo-static, dry, cohesionless,
active-limit scope and that the geotechnical engineer of record governs.

## 2. The tile

### 2.1 `seismic-earth-pressure` -- Mononobe-Okabe Seismic Active Earth Pressure

```
inputs:
  phi      soil friction angle (deg)
  delta    wall friction (deg, default 0; ~2/3 phi for a rough face)
  theta    wall batter from vertical (deg, default 0)
  alpha    backfill slope from horizontal (deg, default 0)
  gamma    soil unit weight (pcf, default 120)
  h_ft     retained height H (ft)
  kh       horizontal seismic coefficient (default 0)
  kv       vertical seismic coefficient, positive up (default 0)

compute:
  psi  = arctan(kh / (1 - kv))                      seismic inertia angle -- the whole wedge rotates by psi
  Kae  = cos^2(phi - theta - psi)
         / [cos(psi) cos^2(theta) cos(delta + theta + psi)
            (1 + sqrt(sin(phi + delta) sin(phi - psi - alpha)
                      / (cos(delta + theta + psi) cos(theta - alpha))))^2]
  Ka   = the same expression at psi = 0             static Coulomb, same geometry
  Pae  = 0.5 Kae gamma H^2 (1 - kv)                 total seismic active thrust (lb/ft)
  Pa   = 0.5 Ka gamma H^2                           static thrust (lb/ft)
  dPae = Pae - Pa                                   dynamic increment
  SW   = 0.375 kh gamma H^2                         Seed-Whitman simplified envelope, at 0.6H
  ybar = (Pa (H/3) + dPae (0.6 H)) / Pae            combined line of action above the base

outputs:
  kae, ka_static, psi_deg, pae, pa_static, d_pae, pae_h, pae_v, sw_increment, y_bar_ft
```

**Why Kae reduces to Ka.** Mononobe-Okabe is not a different theory -- it is Coulomb's wedge with the earthquake
body force folded in as a rotation. At `kh = kv = 0` the inertia angle `psi` is zero, `cos(psi)` is one, and every
`psi` term drops out, leaving the Coulomb coefficient character for character. The tile reports both coefficients and
the bounds-fuzzer pins `Kae == Ka` to 1e-12 for a non-trivial geometry (phi 32, delta 20, theta 10, alpha 5), so the
tile proves its own seismic branch against an independently-implemented sibling.

**When the wedge does not exist.** Once `phi - psi - alpha` goes negative the radical has no real value: the shaking
plus the backfill slope exceed what the soil's friction can hold in an active state, and no finite thrust is
defined. The tile returns an explanatory `{ error }` rather than a number.

**Worked example (pinned).** phi = 35 deg, delta = 17.5 deg (2/3 phi), vertical wall, level backfill, gamma = 120
pcf, H = 12 ft, kh = 0.15, kv = 0. psi = arctan(0.15) = 8.5308 deg; Kae = 0.34053 (published Kae tables for
phi 35 / delta = phi/2 / kv 0 read 0.246 at kh 0, 0.306 at kh 0.10, and 0.380 at kh 0.20 -- this value falls between
the 0.10 and 0.20 entries as it must, and the kh = 0 case reproduces 0.246 exactly); Pae = 0.5 x 0.34053 x 120 x 144
= 2,942.2 lb/ft. Static Coulomb Ka = 0.24612 gives Pa = 2,126.5 lb/ft, so the dynamic increment is 815.7 lb/ft
against the Seed-Whitman envelope 0.375 x 0.15 x 120 x 144 = 972 lb/ft. The combined resultant acts 4.89 ft above
the base, not the static 4.00 ft -- the seismic thrust overturns harder than its magnitude alone implies.

**Seed-Whitman is shown, not substituted.** The 0.375 simplification is deliberately conservative and runs roughly
20-35% above the exact M-O increment across the practical range; the tile reports it beside the exact value as the
envelope many agencies permit in place of the full algebra, and the fuzzer pins `SW > dPae`.

## 3. Scope limits

Cohesionless, dry, level-or-planar-sloped backfill; active limit state (the wall must translate or rotate enough to
mobilize it); planar failure surface; a single pseudo-static equivalent inertia rather than a time history. A
saturated or submerged backfill needs the buoyant unit weight plus a separate hydrodynamic term and is out of scope
(`submerged-earth-pressure` covers the static submerged case). `kh` is commonly a fraction of the site peak ground
acceleration, not the full PGA -- it, `phi`, and `gamma` come from the geotechnical report.

## 4. Wiring

`calc-geotech.js` (compute + `_simpleRenderer`, `GEOTECH_RENDERERS["seismic-earth-pressure"]`), `tools-data.js`,
`tile-meta.js`, `app.js` declare list, `citations.js`, `test/fixtures/compute-map.js`,
`test/fixtures/worked-examples.json`, `scripts/related-tiles.mjs`, `data/search/aliases.json` (+ regenerated shards),
`test/unit/bounds-fuzzer.test.js`, and the regenerated corpus / tile-index / derivations artifacts.
