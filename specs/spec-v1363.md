# roughlogic.com Specification v1363 -- Hot-Holding Connected Load, Demand, and Kitchen Heat Gain (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Hot-holding equipment is the load that makes kitchen electrical services and kitchen cooling both come up short, because its connected load is large, its diversified demand is much smaller, and essentially all of it ends up as sensible heat in the room. The catalog computes service loads and cooling loads separately but has nothing that turns a hot-holding equipment list into both numbers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive equipment wattage or voltage, a diversity factor outside 0-1, or a phase value other than 1 or 3, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the connected-load / demand-factor method and the electrical-to-sensible-heat conversion 1 kW = 3,412 BTU/hr, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `hot-holding-energy` -- Hot-Holding Connected Load, Demand, and Kitchen Heat Gain

```
connected kW = sum of (unit kW x quantity)
demand kW    = connected kW x diversity factor
sensible heat = demand kW x 3,412 BTU/hr per kW
demand amps  = demand kW x 1000 / (V x 1.732 for three-phase, V for single-phase)
tons of cooling = sensible heat / 12,000
```

Hot-holding equipment -- steam tables, holding cabinets, heat lamps, soup wells -- is thermostatically cycling
resistance heat. Connected load is the sum of the nameplates and is the wrong number to size anything by, because
the units are never all in their on-cycle at the same moment; diversified demand, typically 0.6 to 0.75 for a
mixed holding line, is what the feeder actually sees.

The same demand number does double duty, and this is the point of the tile. Every watt a holding cabinet draws
comes back out as sensible heat into the kitchen, so the demand kilowatts convert directly to BTU/hr of cooling
load -- 3,412 BTU/hr per kilowatt, with no efficiency to discount. Kitchens are routinely designed with the
electrical load counted and the same load forgotten on the cooling side, and the tile prints both from one input.

**Inputs:** equipment list (unit kW and quantity per line), diversity factor, service voltage and phase.

**Outputs:** connected kW, demand kW, demand amps, sensible heat gain (BTU/hr), and equivalent tons of cooling.

## 3. Worked example

Three 1.5 kW steam tables, two 0.5 kW heat lamps, and one 2.0 kW holding cabinet, diversity 0.65, on a 208 V
three-phase service:

```
connected = 3(1.5) + 2(0.5) + 2.0 = 7.5 kW
demand    = 7.5 x 0.65            = 4.875 kW
amps      = 4,875 / (208 x 1.732) = 13.5 A
heat gain = 4.875 x 3,412         = 16,634 BTU/hr = 1.39 tons
```

Thirteen and a half amps is a modest feeder. Nearly a ton and a half of cooling, from six pieces of equipment
nobody thinks of as heat sources, is not -- and that is before the fryers, the range, and the dish machine. Size
the feeder on 13.5 A and the makeup air on 16,634 BTU/hr, and note that the exhaust hood only captures the
fraction of it that rises into the hood; the holding cabinet's share stays in the room.

## 4. Scope and non-goals

Electric resistance holding equipment. Gas holding equipment puts most of its heat up the flue and a smaller
fraction into the room, and is not modeled here. The diversity factor is a design judgment, not a code value --
the NEC's kitchen-equipment demand factors are their own calculation and the catalog's service-load tiles handle
that; do not substitute one for the other on a permit drawing. The tile makes no latent-heat estimate, which for
open steam tables is real and can approach the sensible figure. The equipment nameplates, the NEC as adopted, and
the mechanical engineer govern.
