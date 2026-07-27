# roughlogic.com Specification v1017 -- Rankine Active Earth Pressure on a Cohesive Backfill (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1016.md. The clay-backfill companion to
> `lateral-earth-pressure`.
>
> **The gap, and the evidence for it.** `lateral-earth-pressure` names its own omission in the first clause of its
> scope note: "The Rankine case only: a cohesionless soil (**the 2c sqrt(Ka) tension-crack reduction of a cohesive
> backfill is not applied**)." A repo-wide search for `tension crack` returned zero hits. The whole earth-pressure
> family -- `lateral-earth-pressure`, `at-rest-earth-pressure`, `submerged-earth-pressure`,
> `sloped-backfill-earth-pressure`, `coulomb-earth-pressure`, `seismic-earth-pressure` (spec-v1016) -- is
> cohesionless by construction; `phi` must be strictly positive in every one of them, so none can even represent the
> undrained clay case. The two tiles that do take a cohesion input use it for bearing capacity and slope stability,
> never for lateral pressure. The number this settles: what a **clay** backfill actually does to a wall, which is not
> what the sand formulas say.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive unit weight or height, a friction
angle outside [0, 50), a non-positive cohesion, or a negative surcharge returns `{ error }`. Note the deliberate
divergence from the siblings: **`phi = 0` is legal here** (the undrained total-stress clay case), and **`c = 0` is
not** -- a cohesionless backfill is `lateral-earth-pressure`, and the error says so. Citation discipline (v19/v22):
Rankine c-phi active and passive pressure with the tension-crack depth and critical height, as compiled in Das,
*Principles of Foundation Engineering*, and NAVFAC DM-7.02, by name; `GOVERNANCE.general`; the note states that `Hc`
is theory and that OSHA 29 CFR 1926 Subpart P governs any unbraced excavation face.

## 2. The tile

### 2.1 `cohesive-earth-pressure` -- Rankine Active Earth Pressure on a Cohesive (Clay) Backfill

```
inputs:
  phi     friction angle (deg, 0 = undrained clay)
  c_psf   cohesion c (psf, must be > 0)
  gamma   soil unit weight (pcf, default 120)
  h_ft    retained height H (ft)
  q       uniform surcharge (psf, default 0)

compute:
  Ka  = (1 - sin phi)/(1 + sin phi),  Kp = 1/Ka
  sigma_a(z) = Ka (gamma z + q) - 2 c sqrt(Ka)      cohesion cuts a CONSTANT off every depth
  zc  = (2 c sqrt(Ka) - Ka q) / (Ka gamma)          tension-crack depth, clamped to [0, H]
  Pa_cracked   = 0.5 max(sigma_a(H), 0) (H - zc)    design thrust, at (H - zc)/3 above the base
  Pa_uncracked = 0.5 Ka gamma H^2 + Ka q H - 2 c sqrt(Ka) H     full trapezoid, tension credited
  Pw           = 0.5 gamma_w zc^2                   water-filled crack, gamma_w = 62.4 pcf
  Pp           = 0.5 Kp gamma H^2 + 2 c sqrt(Kp) H  passive: cohesion ADDS
  Hc           = 4 c / (gamma sqrt(Ka)) = 2 zc      critical unsupported height (theory)

outputs:
  ka, kp, sigma_top, sigma_base, z_c_ft, pa_cracked, y_bar_ft, pa_uncracked,
  pw_crack, pa_plus_water, pp, h_crit_ft
```

**The trap this closes.** Most texts print the uncracked trapezoid first, and it is *lower* than the cracked value --
crediting the tension subtracts load that the soil cannot actually carry. In the worked example the uncracked figure
is 2,874 lb/ft and the real design thrust is 4,439 lb/ft, a **54% understatement**. The bounds-fuzzer pins
`Pa_cracked > Pa_uncracked` so the ordering can never silently invert.

**The crack fills with water.** A tension crack open to the surface is a slot for surface water. Full hydrostatic over
the crack depth adds 1,732 lb/ft in the worked example, taking the total to 6,172 lb/ft -- more than the crack ever
relieved. This is the engineering reason clay backfills are drained rather than trusted, and the tile reports it beside
the dry case rather than burying it in prose.

**Worked example (pinned).** phi = 20 deg, c = 300 psf, gamma = 115 pcf, H = 20 ft, q = 0. Ka = 0.490291,
sqrt(Ka) = 0.700208; sigma_a(0) = -420.1 psf (tension), sigma_a(20) = 1,127.7 - 420.1 = 707.5 psf;
zc = 600 / (115 x 0.700208) = 7.451 ft; Pa = 0.5 x 707.5 x 12.549 = 4,439.4 lb/ft at 4.183 ft above the base;
uncracked = 11,276.7 - 8,402.5 = 2,874.2 lb/ft; water-filled crack adds 0.5 x 62.4 x 7.451^2 = 1,732.2 lb/ft;
Hc = 2 zc = 14.902 ft.

**Continuity with the cohesionless sibling.** As `c -> 0` both thrusts converge on the Rankine value
`lateral-earth-pressure` returns for the same soil; the fuzzer pins that against the sibling's own output, so this
tile is checked against an independently-implemented neighbor rather than only against itself.

## 3. Scope limits

Vertical wall face, level backfill, no wall friction, no water table below the crack, fully-mobilized active state.
`zc` is clamped to `[0, H]`: a heavy surcharge suppresses the crack entirely (`zc = 0`) and a soft, shallow case can
put the crossing below the base, which returns zero thrust rather than a negative one. The long-term drained
condition can lose most of the cohesion the short-term case shows, so a design that leans on `c` should be run both
ways. `Hc` is a theoretical value and is labeled as such in the output line itself -- **never** an excavation-safety
allowance; OSHA 29 CFR 1926 Subpart P governs any unbraced face.

## 4. Wiring

`calc-geotech.js` (compute + `_simpleRenderer`, `GEOTECH_RENDERERS["cohesive-earth-pressure"]`), `tools-data.js`,
`tile-meta.js`, `app.js` declare list, `citations.js`, `test/fixtures/compute-map.js`,
`test/fixtures/worked-examples.json`, `scripts/related-tiles.mjs`, `data/search/aliases.json` (+ regenerated shards),
`test/unit/bounds-fuzzer.test.js`, and the regenerated corpus / tile-index / derivations artifacts.
