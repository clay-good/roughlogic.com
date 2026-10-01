# roughlogic.com Specification v1880 -- Boil-Water Time and Boiling Point at Altitude (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** The two federal agencies that publish boil-water guidance disagree about where the three-minute rule starts -- 5,000 ft at the EPA, 6,500 ft at the CDC -- and a responder between the two is told one minute by one and three by the other. No tile states the boiling point at a site's elevation or names the split.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: an elevation below -1,500 ft or above 20,000 ft returns `{ error }` (outside the Antoine fit's pressure range and any inhabited US site); no numeric field is ever `Infinity`. Citation discipline
(v19/v22): EPA "Emergency Disinfection of Drinking Water", CDC "How to Make Water Safe in an Emergency", the U.S. Standard Atmosphere (1976) pressure-altitude relation, and the NIST Chemistry WebBook Antoine constants for water named as sources, the local health department and the utility's boil-water notice named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`boil water altitude`, `how long to boil water high elevation`, `boiling point at elevation`, `boil water notice minutes`, `water boiling temperature altitude`.

## 2. The tile

### 2.1 `boil-water-altitude` -- Boil-Water Time and Boiling Point at Altitude

```
pressure      P (kPa) = 101.325 x (1 - 6.87535e-6 x h_ft)^5.25588
              (U.S. Standard Atmosphere, troposphere)
boiling point T (K) = 1663.125 / (5.08354 - log10(P_bar)) + 45.622
              (NIST Antoine constants for water, 344-373 K)
EPA rule      rolling boil 1 min; 3 min above 5,000 ft
CDC rule      rolling boil 1 min; 3 min above 6,500 ft
the split     between 5,000 and 6,500 ft the agencies disagree; the tile
              reports both and recommends the longer time
```

Boiling works by time at temperature, and altitude lowers the temperature. Water boils when its vapour pressure
equals the air pressure, and the air pressure falls about 3.5% per thousand feet near sea level, so the boiling point
falls roughly 1.8 degF per thousand feet. At 10,000 ft a rolling boil is under 194 degF. Pathogen inactivation is still
fast at those temperatures -- which is why the extra time is two minutes rather than twenty -- but the margin that a
sea-level boil carries shrinks, and the guidance lengthens the boil to restore it.

The two agencies drew the line in different places, and neither is wrong to have drawn one; the problem is that
they are both official. A site at 6,000 ft is above the EPA's threshold and below the CDC's, so the same notice
reprinted from two sources gives two answers. The tile states both, names which agency says which, and recommends
three minutes anywhere in the band because the longer boil costs fuel and nothing else.

The boiling point output is there for the reader who is not boiling for disinfection: a pasteurisation step, a
canning or cooking procedure, or a thermometer check that a "boil" is real. It is computed from a standard
atmosphere, so actual weather moves it by a degree or so; a low-pressure storm lowers it further.

**Inputs:** the site elevation (ft or m)

**Outputs:** the standard air pressure (kPa and psia), the boiling point (degF and degC), the EPA boil time, the CDC boil time, and the recommended time with the split flagged

## 3. Worked example

A relief camp at 6,000 ft:

```
P    = 101.325 x (1 - 6.87535e-6 x 6000)^5.25588 = 81.20 kPa = 11.78 psia
T    = 1663.125 / (5.08354 - log10(0.8120)) + 45.622 = 367.06 K
     = 93.9 degC = 201.0 degF
EPA  above 5,000 ft -> 3 minutes
CDC  below 6,500 ft -> 1 minute
```

**Water boils at 201.0 degF here, 11 degrees below sea level -- and the two agencies give different boil times.**
The tile recommends **3 minutes** and says why: the site sits inside the band where the EPA already requires the
longer boil and the CDC does not yet.

**The same method across elevations:**

```
elevation    pressure     boiling point    EPA     CDC
0 ft         101.33 kPa   212.0 degF       1 min   1 min
5,000 ft      84.31 kPa   202.9 degF       1 min   1 min   (at the line)
6,500 ft      79.68 kPa   200.1 degF       3 min   1 min   (at the line)
10,000 ft     69.68 kPa   193.7 degF       3 min   3 min
```

**The sea-level row reproduces 212.0 degF exactly**, which is the check that the constants are right.

## 4. Scope and non-goals

A disinfection-by-boiling aid. It does not address water contaminated with fuel, chemicals, or toxins, which boiling does not remove and can concentrate; it does not address the cooling, storage, or recontamination of boiled water; and it does not determine when a boil-water notice may be lifted, which follows the utility's sampling (`rtcr-coliform-samples`) and the primacy agency's decision. The boiling point is for a standard atmosphere and plain water; weather, dissolved solids, and a pressure cooker all move it. It does not compute fuel needed for boiling. The EPA and CDC guidance, the local health department, and the utility's public notice govern.
