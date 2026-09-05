# roughlogic.com Specification v1567 -- Deaerator Steam Demand and Vent Rate (`calc-steamplant.js`, Group C HVAC, steam plant, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A deaerator heats feedwater to saturation to drive out oxygen, and the steam it takes to do that is a real load on the boiler that plants routinely leave out of their steam balance. It is a heat balance plus a vent rate that is small, continuous, and easy to have wrong in both directions.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive feedwater rate or enthalpy difference, a deaerator temperature at or below the incoming temperature, or a negative vent rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the deaerator heat balance and vent requirement with ASME and the water treatment program named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`deaerator steam demand`, `da heating steam`, `deaerator vent rate`, `feedwater deaeration`, `oxygen removal boiler feedwater`.

## 2. The tile

### 2.1 `deaerator-steam-demand` -- Deaerator Steam Demand and Vent Rate

```
heating steam    S = m_feedwater x (h_out - h_in) / (h_steam - h_out)
DA temperature   saturation temperature at the deaerator operating pressure
                 (5 psig -> about 227 degF; atmospheric -> 212 degF)
vent steam       a continuous plume is required to carry non-condensables away
                 typically 0.1 to 0.5% of throughput; a closed vent defeats the deaerator
oxygen           a properly operating DA leaves 7 ppb or less; chemistry scavenges the rest
```

The heating steam is a mixing calculation: enough steam condenses into the feedwater to bring it from whatever
temperature the condensate and makeup arrive at up to saturation. The colder the incoming water, the more steam
it takes, which is why every bit of condensate return and every degree of blowdown heat recovery
(`blowdown-heat-recovery`) reduces the deaerator's steam demand directly.

The vent is the part that gets mis-set, and it fails in both directions. Vented too little and the
non-condensables the deaerator has just liberated have nowhere to go, so they stay in the water and the deaerator
is not deaerating -- an expensive vessel doing nothing while corrosion continues downstream. Vented too much and
usable steam goes to atmosphere continuously. The correct setting is a small steady plume, and the arithmetic
here says what that plume is worth per year so it is a deliberate choice rather than a valve someone cracked.

The consequence of getting deaeration wrong is not energy, it is boiler tube and condensate line corrosion, which
is why the vent is never closed to save steam.

**Inputs:** feedwater flow, incoming condensate and makeup temperatures and proportions, deaerator operating pressure, the steam enthalpy, the vent rate, and the fuel cost and efficiency

**Outputs:** the mixed incoming temperature, the deaerator saturation temperature, the heating steam required in lb/h and as a percent of throughput, the vent steam and its annual cost, and the steam saved by a stated increase in condensate return

## 3. Worked example

A deaerator handling 25,000 lb/h of feedwater at 5 psig (227 degF saturation), with 60% condensate return at
190 degF and 40% makeup at 60 degF:

```
mixed incoming = 0.60 x 190 + 0.40 x 60           = 138 degF
heat needed    = 25,000 x (227 - 138)             = 2,225,000 BTU/h
heating steam  ~ 2,225,000 / 960 (latent at 5 psig) = 2,318 lb/h  (9.3% of throughput)
```

Now raise condensate return from 60% to 80%:

```
mixed incoming = 0.80 x 190 + 0.20 x 60 = 164 degF
heat needed    = 25,000 x (227 - 164)   = 1,575,000 BTU/h
heating steam  ~ 1,641 lb/h  (6.6% of throughput)
```

**677 lb/h of steam saved** by returning more condensate, which at $9/MMBTU and 8,000 hours is roughly
$70,000 a year. Condensate return pays twice: once for the water and treatment, once here.

The vent, at 0.3% of 25,000 lb/h, is 75 lb/h -- about $7,800 a year. Worth setting correctly and never worth
closing.

## 4. Scope and non-goals

A heat balance for a deaerating feedwater heater. It does not size the deaerator, its storage section, or the
pegging steam control, and it does not evaluate whether the unit is achieving its rated oxygen removal, which is
established by dissolved oxygen measurement rather than by calculation. It does not address the net positive
suction head available to the boiler feed pumps, which the deaerator's elevation and operating pressure govern
and which is the usual reason a feed pump cavitates (`condensate-pump-flash-npsh`). It does not cover chemical
oxygen scavenging, which is required regardless because mechanical deaeration alone does not reach the required
residual, or the corrosion consequences of poor deaeration. Steam plant operation is a licensed activity in many
jurisdictions: the deaerator manufacturer, the water treatment program, ASME, and the jurisdiction's boiler
inspector govern.
