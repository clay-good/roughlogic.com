# roughlogic.com Specification v1562 -- Recompression Chamber Gas Volume and Duration (`calc-diving.js`, Group P Field, Backcountry, and SAR, commercial diving, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-diving.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; commercial diving and hyperbaric), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A recompression chamber consumes gas fast, because every atmosphere of pressure in it is another chamber-volume of gas. Working out whether the supply on hand covers a treatment table is a multiplication that has to be done before the chamber is needed, not during.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive chamber volume, pressure, or ventilation rate, or a negative treatment duration returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the chamber pressurization and ventilation gas relations with 29 CFR 1910 Subpart T and the diving medical officer named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`chamber gas volume`, `recompression chamber air supply`, `hyperbaric ventilation rate`, `treatment table gas requirement`, `chamber pressurization volume`.

## 2. The tile

### 2.1 `chamber-gas-volume` -- Recompression Chamber Gas Volume and Duration

```
gas to pressurize   V_gas = V_chamber x (P_abs / P_atm)      (free gas at surface)
per atmosphere      one chamber volume of free gas per atmosphere of gauge pressure
ventilation         a chamber must be ventilated to control CO2; this dominates consumption
                    on a long treatment with an occupant
oxygen              treatment tables run the occupant on oxygen by mask (BIBS)
total for a table   pressurization + ventilation over the schedule + oxygen
```

The pressurization term is straightforward and larger than people expect: a 250 cubic foot chamber taken to 60
psig holds about five atmospheres, which is roughly 1,250 cubic feet of free air. But pressurization is usually
the smaller half. Ventilation is what dominates, because carbon dioxide from the occupants has to be flushed
continuously, and the required ventilation rate is itself multiplied by the absolute pressure.

That is why a treatment table -- hours long, with an attendant inside -- consumes gas out of all proportion to the
chamber's size, and why the supply calculation has to cover the LONGEST table the operation might run plus its
extensions, not the shortest. A chamber with gas for a Table 5 and a patient who needs a Table 6 with extensions
is a serious problem, and it is discovered under the worst possible circumstances.

Oxygen is a separate inventory. Treatment runs the occupant on oxygen by mask with overboard dump, so oxygen
consumption is its own number and its own cylinder bank, and running out of it ends the treatment as surely as
running out of air.

**Inputs:** chamber internal volume, treatment pressure, the ventilation rate per occupant, the number of occupants, the treatment table duration and profile, and the available air and oxygen inventory

**Outputs:** the free gas required to pressurize, the ventilation gas over the treatment duration, the total air requirement, the oxygen requirement for the occupant, the margin against the entered inventory, and the longest table the inventory supports

## 3. Worked example

A 250 cu ft chamber taken to 60 psig:

```
absolute pressure = (60 + 14.7) / 14.7 = 5.08 ata
gas to pressurize = 250 x 5.08       = 1,270 cu ft of free air
```

1,270 cubic feet just to get to depth. Now ventilation, which is the larger term. At 2 acfm per occupant
with two occupants over a four-hour treatment:

```
free air per minute = 2 x 2 x 5.08 = 20.3 cu ft/min at surface conditions
over 240 minutes                          = 4,878 cu ft
total with pressurization                 = 6,149 cu ft
```

**6,149 cubic feet** -- ventilation is
79% of it, and a supply sized on pressurization alone
would cover about 21% of the requirement.

That is the calculation to run when the chamber is installed, against the longest table the operation could need
plus its extensions.

## 4. Scope and non-goals

A gas volume estimate. It does not select or supply a treatment table, and treatment of decompression illness
is a medical procedure directed by a diving medical officer -- not by a calculation, a supervisor, or this tile.
The ventilation rate required to control carbon dioxide depends on the occupants' work of breathing, the
chamber's own scrubbing if fitted, and the applicable standard, and it must be entered from that standard rather
than assumed. It does not address oxygen supply sizing in detail, the fire hazard that an oxygen-enriched chamber
atmosphere presents (which is the reason for ventilation limits and overboard dump and which has killed
occupants), chamber certification and pressure testing, communications, or the medical lock. It does not evaluate
whether a chamber is required on site, which is a regulatory question. Hyperbaric treatment is a medical
emergency procedure: 29 CFR 1910 Subpart T, the ADCI or IMCA standards as applicable, the diving medical officer,
the employer's dive manual, and the chamber manufacturer govern.
