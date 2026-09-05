# roughlogic.com Specification v1501 -- Natural Infiltration From ACH50 (LBL n-Factor Model) (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A blower door measures the house at 50 pascals, which is a pressure the weather almost never produces. Converting that to what the house actually leaks on an average day is the LBL model, and it is the step between a test result and an energy estimate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive CFM50 or LBL factor, or a volume at or below zero when air changes are requested returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the LBL simplified infiltration model by name with ASHRAE Fundamentals cited, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lbl infiltration model`, `natural infiltration from ach50`, `cfm50 to natural`, `n factor infiltration`, `average infiltration rate house`.

## 2. The tile

### 2.1 `infiltration-lbl-model` -- Natural Infiltration From ACH50 (LBL n-Factor Model)

```
simple form      Q_nat = CFM50 / N
N                the LBL factor, from climate zone, storeys, shielding, and leakiness
detailed form    Q_nat = ELA x sqrt( f_s dT + f_w V^2 )
annual average   the model estimates a seasonal mean, not any particular hour
```

The divisor collapses a lot of physics: how much stack pressure the climate and building height produce, how
much wind pressure the exposure produces, and how a leakage distribution converts pressure to flow. Values run
roughly from 10 in a cold, windy, exposed, tall situation to over 30 in a mild, sheltered, single-storey one --
which means the SAME CFM50 can correspond to a threefold range of real infiltration depending on where the house
stands.

That range is the reason to be careful with what follows. Natural infiltration estimated this way is a seasonal
average and is wrong on any given day by a wide margin: still mild days give almost nothing, a windy cold night
gives multiples of the average. Using it to claim a house is adequately ventilated is exactly the error
`building-tightness-limit` exists to police, and current practice is increasingly to ventilate mechanically and
treat infiltration purely as an energy term.

**Inputs:** CFM50, the LBL factor N (or climate zone, storeys, shielding class and leakiness to select it), house volume, and optionally the ELA and design temperature and wind for the detailed form

**Outputs:** the estimated natural infiltration in cfm and natural air changes per hour, the equivalent ACH50, the seasonal energy attributable to infiltration at an entered heating degree-day figure, and the range implied by a plausible spread of N

## 3. Worked example

A house testing 1,850 CFM50 in a moderate climate, one storey, normal shielding: N = 17.

```
Q_nat = 1,850 / 17 = 109 cfm
in a 19,200 cu ft house: 0.340 natural air changes per hour
```

109 cfm as a seasonal average. Now the honesty check: move the same house to a cold windy exposed site
where N = 11 and it leaks 168 cfm; move it to a sheltered mild site where N = 25 and it leaks
74 cfm. Same house, same test, a 2.3x spread purely from where it stands -- which is
why quoting natural infiltration without stating N is close to meaningless.

Against a 102 cfm ASHRAE 62.2 requirement, this house at N = 17 covers the requirement on average and would
not at N = 25. That is the whole reason the tightness limit is climate-dependent.

## 4. Scope and non-goals

The LBL simplified single-zone infiltration model. It estimates a seasonal average and must not be read as an
hourly or design-condition rate; peak infiltration on a cold windy night is several times the average, and calm
mild periods approach zero. The N factor is a table lookup with coarse categories, and the model does not
distinguish where the leakage is in the envelope, which matters because leakage concentrated at the top and
bottom drives far more stack flow than the same leakage distributed evenly. It does not account for mechanical
system operation, duct leakage to outside, or exhaust fan use, all of which add to or interact with natural
infiltration. It cannot substitute for measured ventilation when indoor air quality is the question. ASHRAE
Fundamentals, RESNET or BPI protocols, and the adopted energy code govern.
