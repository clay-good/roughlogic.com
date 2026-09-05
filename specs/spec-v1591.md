# roughlogic.com Specification v1591 -- Propane Tank Vaporization Capacity (`calc-gas.js`, Group B Plumbing and Gas, propane, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; propane and lp-gas service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A propane tank is a boiler: liquid has to absorb heat through the wetted wall to become the vapour an appliance burns. A tank too small for the load frosts, the pressure falls, and the appliances go out -- and it is a wetted-surface calculation, not a capacity one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank size, wetted fraction, or temperature difference, or a demand at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 58 by name with the tank manufacturer vaporization tables named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propane vaporization rate`, `tank frosting propane`, `lp gas vaporization capacity`, `propane tank sizing btu`, `winter propane capacity`.

## 2. The tile

### 2.1 `propane-vaporization-rate` -- Propane Tank Vaporization Capacity

```
wetted area      the tank surface below the liquid level
vaporization     roughly proportional to wetted area and to (ambient - liquid temperature)
rule of thumb    a common design figure is a fraction of a BTU/h per sq in of wetted surface
                 per degree of temperature difference; manufacturers publish tank tables
capacity falls   as the tank empties, wetted area shrinks and so does vaporization
cold weather     the driving temperature difference shrinks; winter capacity is far lower
```

The number that matters is not how much propane the tank holds but how fast it can turn liquid into vapour, and
that depends on wetted surface and on the temperature difference driving heat through the shell. Both work
against a system in winter: the ambient is cold, so the driving difference is small, and a tank running low has
less wetted surface. A tank that carried the load in October fails in January at 30% full, which is the classic
call.

Frost on the tank is the visible symptom and it is a diagnosis, not a curiosity: it means liquid is boiling fast
enough to chill the shell below the dew point, which means the tank is at or beyond its vaporization capacity.
Once frost forms, the insulating layer makes it worse.

The fixes are ordered: a larger tank, multiple tanks manifolded together, or a vaporizer that adds heat
deliberately. Note that manifolding tanks adds wetted area and therefore capacity, which is why a bank of
cylinders on a high-demand appliance is about vaporization rather than about run time.

**Inputs:** tank size and dimensions, liquid level or percent full, ambient temperature, the connected appliance load, and the manufacturer vaporization table for the tank

**Outputs:** the wetted surface area at the entered level, the vaporization capacity in BTU/h at the entered ambient, the connected load against it, the percent full at which capacity falls below the load, and the tank size or count required for the load in winter conditions

## 3. Worked example

A 1000 gallon tank at 60% full on a 20 degF morning, serving a 500,000 BTU/h load.

Vaporization capacity is read from the manufacturer's table for the tank at that level and ambient. The shape of
the answer is what matters here:

```
at 60% full and  20 degF  -> capacity roughly covers the load
at 30% full and  20 degF  -> wetted area halves; capacity falls with it
at 30% full and   0 degF  -> the driving temperature difference falls too
```

**Both terms move the wrong way at the same time**, which is why the failure is always in a cold snap on a tank
that has been drawn down -- not on a full tank in November when the system was commissioned.

The consequences in order: the tank frosts, the vapour pressure falls, the regulator can no longer maintain
outlet pressure, and appliances lose their flame. The fix is not a bigger regulator. It is more wetted area --
a larger tank or a second one manifolded in -- or a vaporizer.

Working the requirement backwards, a system with a 500,000 BTU/h continuous winter load needs enough wetted
surface to sustain it at the design low ambient with the tank at its minimum operating level, and that condition,
not the full-tank summer condition, is what sizes the installation.

## 4. Scope and non-goals

A screening framework around manufacturer vaporization data. It does not compute vaporization capacity from
first principles: the rate depends on tank geometry, wetted area, ambient temperature, wind, whether the tank is
above or below ground, insulation and paint colour, and the duration of the draw, and the tank manufacturer's
published capacity table for the specific tank governs. Continuous and intermittent draw capacities differ. It
does not size regulators or piping (`propane-regulator-sizing`), determine tank placement and separation
distances (`lp-container-separation`), or address vaporizer selection, which carries its own requirements. It
does not address the fuel-gas piping, appliance connection, or leak testing. LP-gas systems are governed by
NFPA 58, the adopted fuel gas code, the tank and appliance manufacturers, and the AHJ.
