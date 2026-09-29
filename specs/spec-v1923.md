# roughlogic.com Specification v1923 -- Building Temperature Drift in a Heating Outage (`calc-outage.js`, Group C HVAC, building performance in an outage, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-outage.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** When the power or the gas goes out in a winter storm, the question for an occupant, a building manager, or a utility triaging restoration is how many hours until the building is too cold to live in or cold enough to freeze its pipes. `building-ua` gives the heat loss coefficient that answers half of it; no tile turns that coefficient and the building's thermal mass into hours.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive UA or thermal capacitance returns `{ error }`; a threshold temperature at or below the equilibrium temperature returns the note that the building never reaches it, not `Infinity`; a threshold above the starting temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the lumped-capacitance (Newton cooling) model named as the method, with the "hours of safety" thermal-resilience framing of the Lawrence Berkeley National Laboratory study *Assessing thermal resilience of an assisted living facility during heat waves and cold snaps with power outages* (OSTI 1984644) cited for the metric, and ASHRAE Fundamentals cited by chapter for material heat capacities, the mechanical contractor or engineer named as governing, GOVERNANCE.mechanical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`how long will my house stay warm without power`, `house temperature drop power outage`, `building time constant`, `hours of safety cold`, `no heat how fast does house cool`.

## 2. The tile

### 2.1 `building-outage-cooldown` -- Building Temperature Drift in a Heating Outage

```
time constant  tau = C / UA (h)
               C = effective thermal capacitance, Btu/degF (sum of mass x
                   specific heat of what exchanges heat with the room air:
                   gypsum ~0.26, wood ~0.3-0.4, concrete ~0.2, water 1.0
                   Btu/lb-degF)
               UA = envelope heat loss coefficient, Btu/h-degF (building-ua)
equilibrium    T_eq = T_out + Q_internal / UA  (people ~250 Btu/h each,
               plus any remaining equipment)
drift          T(t) = T_eq + (T_start - T_eq) x e^(-t / tau)
hours to T     t = tau x ln((T_start - T_eq) / (T_threshold - T_eq))
thresholds     entered; common choices 50 degF (habitability) and 40 degF
               (a screening line for pipes in exterior walls)
```

A building without heat cools the way a cup of coffee does: fast at first, slower as it approaches the outdoor
temperature, and the pace is set by one number, the time constant. The time constant is the heat the building stores per
degree divided by the heat it loses per degree, so a heavy, well-sealed building coasts for days and a light, leaky one
for hours. `building-ua` supplies the loss; the tile asks for the storage, with a helper that adds up mass times specific
heat for the materials that exchange heat with the room air.

The people inside matter at the margin. Each person gives off roughly 250 Btu an hour of sensible heat at rest, which raises the
temperature the building settles toward and slows the last part of the drop. The tile includes it because a family of
four in a small house moves the equilibrium by several degrees, and because the practical advice -- gather in one room
-- works by concentrating that heat in less air.

The single-node model is a simplification and the tile says which way it errs. The room air and lightweight surfaces
cool faster than the structure, so the first hours drop faster than the curve, and pipes in exterior walls and crawl
spaces reach freezing well before the room does. The output is a planning estimate for triage, not a prediction for a
particular pipe.

**Inputs:** the envelope UA (or a link to `building-ua`), the effective thermal capacitance (or the material masses for the helper), the starting indoor temperature, the outdoor temperature, the internal gains or number of occupants, and the threshold temperatures

**Outputs:** the time constant, the equilibrium temperature, the hours to each threshold, and the indoor temperature after 12, 24, and 48 hours

## 3. Worked example

The small house from `building-ua` (UA 309.7 Btu/h-degF), with an effective capacitance of 10,000 Btu/degF, at 68 degF
when the power fails, 10 degF outside, nobody home:

```
tau        10,000 / 309.7 = 32.3 h
to 50 degF 32.3 x ln(58 / 40) = 12.0 h
to 40 degF 32.3 x ln(58 / 30) = 21.3 h
at 24 h    10 + 58 x e^(-24/32.3) = 37.6 degF
```

**Twelve hours to 50 degF and about 21 to 40 degF** -- a house that loses power at dusk is below 40 by the next
afternoon.

**With four people at home (1,000 Btu/h):**

```
T_eq = 10 + 1,000 / 309.7 = 13.2 degF    to 40 degF: 23.1 h
```

**Two hours longer.** Air-sealing and better windows (the 17% UA reduction in `building-ua`'s example) stretch the 40
degF mark to 25.6 h -- **the efficiency upgrade is also a resilience upgrade.**

## 4. Scope and non-goals

A single-node estimate of indoor temperature drift. It does not model solar gain, wind-driven infiltration changes, stratification, multiple zones, the faster cooling of exterior walls, attics, and crawl spaces, or the building's thermal mass distribution, and it does not predict when a specific pipe freezes (`pipe-freeze-time`). The capacitance is an estimate and dominates the result; a measured cooldown from a previous outage is the best calibration. It does not address carbon monoxide hazards from improvised heating, which kill people in every winter outage. The mechanical contractor or engineer and local emergency guidance govern.
