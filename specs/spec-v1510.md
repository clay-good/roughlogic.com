# roughlogic.com Specification v1510 -- Blast Airblast Overpressure Screen (`calc-mining.js`, Group E Carpentry and Construction, blasting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Airblast is the complaint generator. It rattles windows a mile away, it is what neighbours actually notice, and it is limited in decibels on a linear-peak scale that most people have never used. It scales with the cube root of charge weight, not the square root that governs ground vibration.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive distance or charge weight, or a non-positive pressure when converting to decibels returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cube-root airblast scaling and the 133 dB linear-peak limit convention, with MSHA and OSM named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`airblast overpressure blasting`, `blast decibel limit`, `cube root scaled distance`, `133 db airblast`, `blast noise complaint`.

## 2. The tile

### 2.1 `blast-airblast-overpressure` -- Blast Airblast Overpressure Screen

```
cube-root scaled distance  SD_a = D / W^(1/3)
overpressure               P = K_a x SD_a^(-b)      (site constants)
decibels                   dB = 20 log10( P / 2.9e-9 psi )
typical limit              133 dB linear peak (0.014 psi) at the nearest structure
confinement                unconfined or vented charges are far worse than stemmed ones
```

The cube root is the physical difference from ground vibration: airblast is an expanding spherical pressure
wave in air, so it scales with the cube root of energy, while ground vibration scales with the square root. That
means charge weight has LESS leverage on airblast than on vibration, and the things that matter more are
confinement and weather.

Confinement dominates. A properly stemmed hole releases almost nothing to the air; a hole with short stemming, an
exposed detonating cord trunkline, a mud seam that vents, or an unstemmed secondary charge can be tens of
decibels worse for the same pounds. And because decibels are logarithmic, 20 dB is a factor of ten in pressure.
Weather is the other multiplier -- a temperature inversion or a wind toward the neighbours can focus airblast and
raise it well above the flat-ground prediction, which is why blast plans have wind and inversion restrictions
that no formula replaces.

**Inputs:** distance to the nearest structure, charge weight per delay, the site airblast constants, the confinement condition, and the regulatory decibel limit

**Outputs:** the cube-root scaled distance, the predicted overpressure in psi and decibels linear peak, the margin against the limit, the maximum charge for the limit at that distance, and the distance at which a given charge complies

## 3. Worked example

A structure 1,200 ft away, 340 lb per delay, well stemmed:

```
SD_a = 1,200 / 340^(1/3) = 1,200 / 6.98 = 171.9 ft/lb^(1/3)
```

At a typical stemmed-hole constant this scaled distance predicts an overpressure comfortably under the 133 dB
limit -- 133 dB is only 0.014 psi, which is a very small pressure and a very audible one.

The confinement point, in numbers: if the same shot vents through short stemming, the effective airblast can rise
by 20 dB or more. Twenty decibels is a tenfold pressure increase, and it is the difference between a shot nobody
mentions and forty phone calls. No adjustment to the pattern buys that back -- the fix is stemming
(`blast-stemming-length`), covered trunklines, and not shooting into a wind or an inversion.

Note also how weakly charge weight helps: halving the charge to 170 lb raises the cube-root scaled distance
only to 216.6, a 26% improvement, where the same halving would
have improved the ground-vibration scaled distance by 41%.

## 4. Scope and non-goals

An airblast prediction from generic or site-supplied constants. Airblast is far more variable than ground
vibration and far more weather-dependent: temperature inversions, wind, and cloud cover can focus the wave and
produce readings well above any flat-ground prediction, and no calculation substitutes for the wind and weather
restrictions in a blast plan or for monitoring. The constants depend heavily on confinement, and the tile cannot
know whether a hole will vent. It does not address ground vibration (`blast-scaled-distance-ppv`), flyrock, or
the structure-response question of what overpressure actually damages what. Decibel limits and their measurement
weighting differ between jurisdictions and the adopted one governs. Blasting is a licensed activity: the blaster
in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction, and the site's blast plan
govern.
