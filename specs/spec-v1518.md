# roughlogic.com Specification v1518 -- Pit Dewatering Pump Head and Staging (`calc-mining.js`, Group E Carpentry and Construction, quarry and aggregate, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Pumping water out of a deep pit is a static-lift problem, and past a certain depth one pump physically cannot do it -- not because it lacks power but because the head exceeds what the pump develops. Staging is the answer, and knowing where the stages go is a division a pit foreman can do.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive static lift, per-pump head capability, or flow, or a suction lift exceeding the atmospheric limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the total dynamic head relation and the practical suction-lift limit as standard dewatering practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pit dewatering staging`, `deep pit pump head`, `multi stage dewatering`, `pump suction lift limit`, `quarry dewatering pump sizing`.

## 2. The tile

### 2.1 `pit-dewatering-staging` -- Pit Dewatering Pump Head and Staging

```
total head        H = static lift + friction + discharge pressure
stage count       n = ceil( H / H_per_pump )
lift per stage    H_stage = H / n
NPSH available    the suction side limit; a pump on the bench cannot suck water up to itself
suction lift      practical limit roughly 20 to 25 ft at sea level, less with altitude and warm water
```

Total head is static lift plus friction, and in a deep pit the static lift dominates -- a 180 ft pit is 180 ft of
head before a single foot of pipe friction. When that exceeds one pump's capability the system is staged: pumps
placed on benches, each lifting to the next, each seeing only its share.

The constraint that surprises people is on the SUCTION side. A pump sitting on a bench above the water can only
lift water to itself by atmospheric pressure, which is about 34 ft in theory and 20 to 25 ft in practice once
friction, vapour pressure, and NPSH margin are accounted for -- and less at altitude. That is why deep pit
dewatering uses submersibles in the sump or pumps mounted low with flooded suction, and why a plan that shows a
pump on the rim drawing from the bottom does not work at any horsepower.

The field version of this tile is a sanity check before renting equipment: total head, how many stages, and
whether the suction arrangement at each stage is physically possible.

**Inputs:** static lift from water surface to discharge, pipe size, length and fittings for friction, discharge pressure, the head one pump develops at the required flow, and the suction arrangement at each stage

**Outputs:** the friction head, the total dynamic head, the number of stages required, the lift per stage, the suction lift at each stage against the practical limit, and the total pumping power and energy for the duty

## 3. Worked example

A pit needing to lift water 180 ft to the discharge point, with 42 ft of friction in the pipe run,
using pumps that develop 120 ft each at the required flow:

```
total head = 180 + 42          = 222 ft
stages     = ceil(222 / 120)  = 2
per stage  = 222 / 2          = 111 ft each
```

Two stages, each lifting about 111 ft, with the intermediate pump on a bench roughly halfway up.

Now the suction check, which is the one that stops bad plans. If the second-stage pump sits on a bench and draws
from a catch sump 28 ft below it, that is beyond the practical 20 to 25 ft suction lift -- the pump will cavitate
or fail to prime regardless of its rating. The fix is to move the pump down to the sump or use a submersible, not
to buy a bigger pump. At 5,000 ft elevation the practical limit drops further still, to roughly 17 to 20 ft.

## 4. Scope and non-goals

Head and staging arithmetic for a dewatering system. It does not size the pump, select the impeller, or
evaluate the pump's curve against the system curve, which is where the actual operating point is found; it does
not compute NPSH available in full, which requires the water temperature, altitude, and suction line details, and
which is the real limit rather than the rule-of-thumb suction lift used here. It does not address the inflow rate
the pit actually produces -- groundwater inflow and storm response, which is what determines the required
capacity and which comes from a hydrogeological assessment. It does not address discharge permitting, sediment
control, or water quality, all of which are regulated. Pump total dynamic head generally is `pump-tdh`. The pump
manufacturer's curves, the site hydrogeologist, and the discharge permit govern.
