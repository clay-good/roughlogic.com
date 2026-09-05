# roughlogic.com Specification v1498 -- Zonal Pressure Diagnostic Leakage Split (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A blower door says how leaky a house is. Zonal pressure diagnostics says WHERE, by measuring how much of the house pressure a buffer zone -- an attic, a crawl space, an attached garage -- picks up, and splitting its leakage between the inside and the outdoors. It is the difference between knowing a number and knowing what to seal.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a house reference pressure at or below zero, or a zone pressure outside the range from zero to the house pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the series-leakage pressure ratio method as standard building-diagnostic practice, with BPI and RESNET named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`zonal pressure diagnostics`, `pressure ratio attic`, `series leakage diagnostic`, `where is the house leaking`, `add a hole test`.

## 2. The tile

### 2.1 `zonal-pressure-diagnostics` -- Zonal Pressure Diagnostic Leakage Split

```
pressure ratio    PR = dP_zone_to_outside / dP_house_to_outside
series leakage    a zone at PR near 1.0 is tightly connected to the HOUSE, loosely to outside
                  a zone at PR near 0.0 is tightly connected to OUTSIDE, loosely to the house
leakage split     ratio of house-to-zone to zone-to-outside leakage = sqrt( PR / (1 - PR) )
add-a-hole        opening a known hole to outside and re-reading isolates each path
```

Two leakage paths in series -- house to attic, attic to outside -- divide the pressure between them exactly as
two resistors divide voltage. If the attic sits at 45 Pa while the house is at 50, almost all the resistance is
between the attic and outdoors, meaning the ceiling plane is wide open and the attic is nearly part of the house.
If the attic sits at 3 Pa, the ceiling is tight and the attic is effectively outdoors.

That single reading redirects the work. A high pressure ratio at the attic says seal the ceiling plane -- top
plates, can lights, chases -- and says the attic insulation is currently being bypassed by air. A high ratio at
an attached garage is a health finding rather than an energy one, because it means garage air, with everything in
it, is inside the pressure boundary of the house. The add-a-hole variant, where a known opening is made to
outside and the ratio re-read, turns the qualitative split into a quantitative one.

**Inputs:** the house-to-outside pressure with the blower door running, the zone-to-outside pressure, the zone identity, and optionally the known hole area for an add-a-hole test

**Outputs:** the pressure ratio, the interpretation of which boundary is tighter, the ratio of the two leakage paths, the estimated share of house leakage that passes through the zone, and the quantified split where an add-a-hole reading is entered

## 3. Worked example

A blower door holding the house at 50 Pa with respect to outside. Two zones read:

```
attic     dP to outside 42 Pa   PR = 42/50 = 0.84
crawl     dP to outside  6 Pa   PR =  6/50 = 0.12
leakage path ratio, attic = sqrt(0.84 / 0.16) = 2.29
leakage path ratio, crawl = sqrt(0.12 / 0.88) = 0.37
```

The attic at PR 0.84 is nearly at house pressure: the ceiling plane is more than twice as leaky as the attic
roof and soffits, so attic air is house air. That is where the money is, and blowing more insulation on top of
that ceiling without sealing it first would be close to wasted.

The crawl at PR 0.12 is nearly at outdoor pressure -- the floor above it is comparatively tight. Sealing the
crawl walls would help the crawl, not the house. Two zones, two opposite prescriptions, from two gauge readings
that take five minutes.

## 4. Scope and non-goals

A diagnostic ratio and interpretation from manometer readings taken with the blower door running. Without an
add-a-hole measurement the leakage split is a ratio, not an area, and the tile reports it as such. It assumes
two leakage paths in series with the standard flow exponent, which breaks down when a zone has a large deliberate
opening, when zones interconnect (an attic over a garage over a crawl), or when the zone is being pressurized by
a duct leak rather than by the blower door -- a duct leak into an attic is a common and important confounder that
this reading cannot distinguish. It does not measure duct leakage, which is a separate test. Combustion safety
must be evaluated independently before any sealing is done. The weatherization program standard, BPI or RESNET
protocols, and the auditor's judgment govern.
