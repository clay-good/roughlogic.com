# roughlogic.com Specification v1807 -- Server Inlet Temperature and Humidity Envelope (`calc-datacenter.js`, Group C HVAC, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Equipment warranties are written against an inlet condition, not a room condition, and the condition has three limits rather than one. Raising supply temperature to save energy runs into the dew point limit before it runs into the dry bulb limit, and the dew point is the one nobody watches.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive absolute temperature, a relative humidity outside 0 to 100 percent, or a temperature outside the correlation's valid range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASHRAE TC 9.9 thermal guideline envelope and the Tetens dew-point relation with the current ASHRAE TC 9.9 edition and the equipment manufacturers' limits named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ashrae server inlet envelope`, `class a1 recommended allowable temperature`, `data center dew point limit`, `rack inlet humidity`, `raising supply temperature data center`.

## 2. The tile

### 2.1 `server-inlet-envelope` -- Server Inlet Temperature and Humidity Envelope

```
where measured   at the equipment INLET, which is the front of the rack, not the
                 room, the floor tile, or the cooling unit return
recommended      ASHRAE TC 9.9 Class A1 recommended is about 64.4 to 80.6 degF dry
                 bulb; the band where equipment is expected to be reliable
allowable        Class A1 allowable is about 59 to 89.6 degF; excursions are
                 permitted within limits the manufacturer states
upper dew point  about 59 degF, and relative humidity at or below 60%
                 -- BOTH apply, and the dew point usually binds first
lower moisture   a lower dew point limit exists against electrostatic discharge
dew point        computed from dry bulb and relative humidity; it is the absolute
                 moisture content and it does not move with temperature
the trap         raising dry bulb at constant relative humidity RAISES the dew
                 point, so an energy project can breach the moisture limit while
                 the temperature is still well inside its own
```

The measurement point is the first thing to get right and it is routinely got wrong. The envelope describes
the air entering the equipment, and the air entering the equipment at the top of a rack in a poorly contained
aisle bears little relation to the room average, the supply temperature, or anything a building management
system is trending. A hall can report a comfortable room condition and be delivering air well outside the
envelope to a specific rack, and only an inlet survey will show it.

The energy case for running warm is strong and the limit it runs into is not the obvious one. Raising supply
temperature reduces chiller lift, extends economiser hours, and cuts energy substantially, so every operator is
pushed in that direction. What binds is usually moisture: relative humidity is a ratio, so holding it constant
while raising temperature raises the absolute moisture content, and the dew point limit is reached while the
dry bulb is still comfortably inside its band.

Recommended and allowable are different promises and should not be blurred. The recommended band is where
equipment is expected to give its stated reliability indefinitely. The allowable band is a wider range within
which the equipment will operate, with the manufacturer's own limits on how long and how often. Designing to
the allowable band as though it were the operating target is a decision about equipment life that ought to be
taken explicitly.

**Inputs:** the inlet dry bulb temperature and relative humidity, the equipment class recommended and allowable dry bulb limits, and the upper dew point and relative humidity limits

**Outputs:** the dew point at the entered condition, whether the dry bulb falls in the recommended or the allowable band, whether the dew point and relative humidity limits are met, the margin on each limit, and the same checks at an alternative temperature and humidity

## 3. Worked example

A rack inlet at 78 degF and 45 percent relative humidity:

```
dew point = 54.9 degF
dry bulb  78 degF -- inside recommended (64.4 to 80.6)
dew point 54.9 degF -- inside the 59 degF limit, by 4.1 degF
RH        45% -- inside the 60% limit
```

**All three limits met.** Now take the energy project and raise the supply temperature 4 degF, holding
humidity control where it is:

```
82 degF at 45% RH: dew point = 58.6 degF
dry bulb  82 degF -- ABOVE recommended 80.6, inside allowable 89.6
dew point 58.6 degF -- inside 59, by 0.4 degF
```

**The dry bulb has left the recommended band and the dew point has 0.4 degF left.** The margin that was
4.1 degF is now 0.4 degF, **from a temperature change that did not touch the humidity setpoint at all.**

**Let relative humidity drift up 5 points at that same temperature and the moisture limit goes:**

```
82 degF at 50% RH: dew point = 61.5 degF -- OVER the 59 degF limit by 2.5 degF
```

**Outside the envelope on moisture, with the dry bulb still 7.6 degF inside its own allowable limit.** Nothing
about the temperature was wrong. **The dew point bound first, and a hall trending dry bulb and relative
humidity separately would see two readings that both look fine.**

**Trend the dew point, not the relative humidity.** Relative humidity is a ratio that changes with temperature
even when the moisture in the air does not; **dew point is the absolute content and is the quantity the limit
is actually about.**

## 4. Scope and non-goals

A condition check against published guidelines. ASHRAE TC 9.9 defines several equipment classes with different bands, the guidelines are revised between editions, and the limits entered here are for one class in one edition -- the current edition and the class the installed equipment belongs to govern. The guidelines are not a warranty: the equipment manufacturer's own stated environmental limits, excursion allowances, and any derating or fan-speed behaviour at elevated inlet temperature take precedence, and some equipment derates or reduces its reliability specification well inside the allowable band. It does not measure the inlet condition, which must be surveyed at the equipment rather than inferred from room or supply instrumentation, and it does not address the spatial variation that makes a room average meaningless (`containment-bypass-airflow`). It does not address the lower moisture limit and electrostatic discharge, gaseous and particulate contamination limits, which are part of the same guidelines and govern in polluted environments, altitude derating, or the rate-of-change limits that apply to tape and some other equipment. The current ASHRAE TC 9.9 thermal guidelines, the equipment manufacturers' stated environmental limits, and the facility engineer govern.
