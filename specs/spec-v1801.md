# roughlogic.com Specification v1801 -- Rack Power Density and Required Cooling Airflow (`calc-datacenter.js`, Group C HVAC, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Every watt a rack consumes leaves it as heat in the air, so the airflow a rack needs follows directly from its load and the temperature rise across the servers. Above a modest density the required airflow exceeds what a raised floor can deliver into the rack's own footprint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rack load, temperature rise, or tile delivery returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the sensible heat airflow relation and ASHRAE TC 9.9 thermal guidelines with the equipment manufacturers' airflow data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rack power density airflow`, `cfm per kw data center`, `raised floor tile capacity rack`, `delta t across server`, `in row cooling density threshold`.

## 2. The tile

### 2.1 `rack-power-density-airflow` -- Rack Power Density and Required Cooling Airflow

```
the conversion   all electrical power into a rack becomes heat: kW x 3,412 Btu/h
airflow          cfm = kW x 3,412 / (1.08 x dT across the equipment)
                 which is about 158 cfm per kW at a 20 degF rise
delta T          server fans set it; 20 to 30 degF is usual, and it RISES as
                 servers throttle their fans up at higher inlet temperatures
tile delivery    a 25% open perforated tile passes roughly 400 to 600 cfm at
                 ordinary plenum pressure; a high-flow tile 900 to 1,200
                 (`raised-floor-tile-airflow`)
tiles per rack   required cfm / tile delivery -- and a rack's footprint only has
                 room for one or two tiles in front of it
the threshold    above roughly 8 to 10 kW a rack cannot be fed from the floor in
                 front of it, and containment or in-row cooling is required
recirculation    a rack whose supply falls short makes up the difference from the
                 hot aisle, which raises its inlet temperature immediately
```

The airflow requirement is not a design choice, it is an identity. Electrical power into a rack leaves as heat
into air, and once the temperature rise is fixed by the server fans, the volume of air follows arithmetically.
The only ways to reduce it are to allow a larger rise or to move less heat, and the server decides the first
while the business decides the second.

The tile count is where the physics collides with the floor plan. A rack occupies roughly the width of one
floor tile, so the front of a rack has room for one perforated tile and, if the aisle is generous, a share of
another. When the required airflow exceeds what those tiles can pass, no amount of chiller capacity helps --
the cooling is available and cannot get into the rack. That is the density threshold at which raised floor
distribution simply stops working.

What happens past the threshold is worse than starvation, because the rack does not simply run short of air.
Server fans pull whatever they need, and what they cannot get from the floor they take from the room -- which
means from the hot aisle behind them. Inlet temperature rises, fans speed up, the rise across the equipment
changes, and a local recirculation loop establishes itself that no plant-level measurement will show.

**Inputs:** the rack load in kilowatts, the temperature rise across the equipment, the perforated tile delivery, and optionally a second rack density and a high-flow tile

**Outputs:** the heat load in Btu per hour, the airflow required, the cfm per kilowatt, the perforated tiles the rack needs, the same figures for a second density and a high-flow tile, and the airflow at an alternative temperature rise

## 3. Worked example

A rack at 8 kW with a 20 degF rise across the servers:

```
heat    = 8 x 3,412 = 27,296 Btu/h
airflow = 27,296 / (1.08 x 20) = 1,264 cfm
        = 158 cfm per kW
```

**1,264 cfm into one rack.** At 500 cfm from a standard perforated tile:

```
tiles = 1,264 / 500 = 2.5
```

**2.5 tiles for a rack that is one tile wide.** It already needs more floor opening than sits in front of it,
and it is only at 8 kW.

**Now take the same rack to 15 kW:**

```
airflow = 2,369 cfm
tiles   = 2,369 / 500 = 4.7
```

**4.7 standard tiles in front of a single rack is not a layout, it is an impossibility.** High-flow tiles help
and do not solve it:

```
at 900 cfm per tile: 2.6 tiles
```

**Still more than a rack's footprint provides.** This is the density threshold, and it is why halls above
roughly 10 kW a rack are contained, in-row cooled, or rear-door cooled rather than floor-fed. **No amount of
chiller capacity substitutes for air that cannot reach the inlet.**

**Allowing a larger rise is the one lever that moves the requirement:**

```
at a 30 degF rise: 1,580 cfm, 33 percent less air
```

**Which is exactly what raising supply temperature does** -- and it is bounded by the inlet envelope the
equipment is warranted to (`server-inlet-envelope`), not by how much air the operator would like to save.

**And the failure mode is not a shortage, it is a loop.** A rack short of supply air makes the difference up
from the hot aisle behind it, its inlet temperature climbs, its fans speed up, and the recirculation
establishes itself locally where no plant instrument is looking.

## 4. Scope and non-goals

A first-principles airflow calculation. The temperature rise across the equipment is entered and is not a constant: it is set by the servers' own fan control, it varies by equipment type and load, and it changes with inlet temperature as fans respond -- so a design rise is an assumption that the installed equipment may not honour. Tile delivery is entered and depends on plenum pressure, tile type, and location (`raised-floor-tile-airflow`), and the figure varies widely across a single floor. It assumes all rack power becomes heat in the room air, which is correct for air-cooled equipment and not for liquid-cooled or rear-door heat-exchanger racks. It does not design the cooling distribution, select containment, in-row, or rear-door cooling, address the pressure and obstruction conditions under the floor, or account for cable and obstruction blockage of the plenum. It does not evaluate redundancy or what happens to a high-density rack during a cooling failure, which at these densities is a matter of seconds rather than minutes. ASHRAE TC 9.9 thermal guidelines, the equipment manufacturers' airflow data, and the facility engineer govern.
