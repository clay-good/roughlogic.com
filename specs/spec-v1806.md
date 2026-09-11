# roughlogic.com Specification v1806 -- Chilled Water Loop Thermal Ride-Through (`calc-datacenter.js`, Group C HVAC, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** When the utility fails, the chillers stop and the servers do not. The water already in the loop is the only cooling the hall has until a chiller reloads, and the ride-through it buys has to cover the generator start AND the chiller restart sequence, not just the transfer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive loop volume or IT load, a tolerable temperature at or below the supply temperature, or negative start times returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the sensible thermal storage relation with the chiller manufacturer's restart sequence and ASHRAE TC 9.9 guidelines named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`chilled water ride through`, `thermal storage data center loop`, `chiller restart time cooling gap`, `loop volume minutes of cooling`, `data center cooling continuity`.

## 2. The tile

### 2.1 `chilled-water-ride-through` -- Chilled Water Loop Thermal Ride-Through

```
the gap          on a utility loss the IT load continues on UPS; the chillers drop
                 and cannot restart until the generator is up and stable
stored cooling   the loop water's sensible capacity between its supply temperature
                 and the highest temperature the hall can tolerate
energy           Btu = gallons x 8.34 lb/gal x 1.0 Btu/lb-degF x allowable rise
ride-through     stored Btu / IT load in Btu/h, expressed in minutes
what it must     generator start and transfer, PLUS the chiller's own start
cover            permissive, oil, and loading sequence -- which is the longer term
pumps and fans   must be on UPS or the stored cooling never reaches the racks
allowable rise   bounded by the server inlet envelope (`server-inlet-envelope`),
                 not by what the chiller would tolerate
extra volume     a thermal storage tank is how the gap is closed when the loop
                 alone is short
```

The ride-through requirement exists because two systems recover at very different speeds. Electrical supply is
restored in seconds: the UPS carries through the transfer and the generator picks up within tens of seconds.
Mechanical cooling is not restored in seconds -- a chiller has start permissives, oil pressure and temperature
conditions, and a loading ramp, and several minutes is normal even when everything works. In between, the IT
load is running at full power with no heat rejection.

The water in the pipes is what covers the gap, and it is a surprisingly capable buffer because water's heat
capacity is high and the allowable temperature rise is real. A loop of ordinary volume carries a hall for long
enough that most sites need no additional storage at all -- but the calculation has to be done, because a
compact loop on a high-density hall does not.

The mistake that defeats the whole arrangement is leaving the pumps or the air handler fans off the
uninterruptible supply. Stored cooling in a stationary loop is inert; it has to be circulated to the coils and
blown across them, and a hall whose chilled water pumps drop with the utility has all of its ride-through
sitting in the pipes doing nothing while the racks heat at their adiabatic rate.

**Inputs:** the chilled water loop volume, the IT load, the supply temperature, the highest tolerable temperature, the generator start and transfer time, and the chiller restart and loading time

**Outputs:** the stored cooling energy, the ride-through in minutes, the time the restart sequence requires, the margin or shortfall, the ride-through at a smaller loop volume, and the additional volume needed to close a shortfall

## 3. Worked example

A 5,000 gal loop carrying a 500 kW hall from 45 degF supply, with 60 degF the highest the hall tolerates:

```
IT load = 500 x 3,412 = 1,706,000 Btu/h
mass    = 5,000 x 8.34 = 41,700 lb
stored  = 41,700 x 1.0 x (60 - 45) = 625,500 Btu
ride    = 625,500 / 1,706,000 = 0.367 h = 22.0 minutes
```

**22 minutes of cooling in the pipes.** Against what it has to cover:

```
generator start and transfer  0.5 min
chiller restart and loading   7.0 min
total                         7.5 min
```

**14.5 minutes of margin** -- comfortable, and the reason most halls of this size need no thermal storage
tank.

**The number people quote is the generator, and it is the wrong number.** Covering only the 0.5 minute transfer
would call for a loop of 114 gallons. **The chiller is 14 times the generator's contribution to the
gap**, and a design that sizes storage against the electrical transfer alone is short by that factor.

**Now shrink the loop.** A compact primary-only system on the same load:

```
1,200 gal: ride = 5.3 minutes
```

**5.3 minutes against a 7.5 minute requirement.** The hall is 2.2 minutes short, and closing it takes
505 additional gallons of storage -- a tank, because a loop cannot be made larger by wishing.

**And none of this works if the pumps drop.** Stored cooling in a stationary loop is inert. **The chilled water
pumps and the air handler fans have to be on the uninterruptible supply**, or the ride-through sits in the pipe
while the racks heat at their adiabatic rate -- which at data hall densities is degrees per minute, not per
hour.

## 4. Scope and non-goals

A thermal storage estimate. It treats the loop as a single well-mixed volume at one temperature, which it is not: supply and return legs are at different temperatures, stratification and short-circuiting in a storage tank reduce usable capacity below the nominal volume, and the coils see a rising supply temperature throughout the event rather than a step. The allowable temperature rise is bounded by what the equipment tolerates at its inlet (`server-inlet-envelope`) and by the coils' ability to deliver capacity as the water warms -- capacity falls as the supply temperature climbs, so the last minutes of a ride-through are not as effective as the first. Chiller restart times are entered and vary greatly with machine type, control sequence, and whether a fast-restart or continuous-operation arrangement is provided; the manufacturer's sequence governs. It does not design the storage tank, the pumping and its uninterruptible supply, the control sequence for the event, or the sequence of return to normal. It does not address what happens at high rack density, where the air-side thermal mass is negligible and inlet temperatures rise within seconds of airflow loss. The chiller and equipment manufacturers' data, ASHRAE TC 9.9 guidelines, a facility failure-mode analysis, and the mechanical designer govern.
