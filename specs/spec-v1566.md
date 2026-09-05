# roughlogic.com Specification v1566 -- Boiler Blowdown Heat Recovery and Efficiency Gain (`calc-steamplant.js`, Group C HVAC, steam plant, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Boiler blowdown leaves the boiler at saturation temperature and goes down the drain carrying all of it. Recovering that heat is one of the cheapest energy projects in a plant, and sizing it starts with how much blowdown there actually is -- which follows from the cycles of concentration, not from a valve setting.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a cycles of concentration at or below one, a non-positive steam rate, or a blowdown rate exceeding the steam rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the blowdown and cycles-of-concentration relations with ASME and the water treatment program named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`boiler blowdown heat recovery`, `blowdown rate cycles of concentration`, `flash tank blowdown`, `blowdown energy savings`, `continuous blowdown sizing`.

## 2. The tile

### 2.1 `blowdown-heat-recovery` -- Boiler Blowdown Heat Recovery and Efficiency Gain

```
blowdown rate    B = steam rate x (1 / (cycles - 1))
                 equivalently B = S x TDS_feed / (TDS_limit - TDS_feed)
heat in blowdown Q = B x (h_sat_liquid - h_makeup)
flash steam      the fraction that flashes when let down to the flash tank pressure
recoverable      flash steam to the deaerator + the remaining liquid through a heat exchanger
savings          Q x hours x fuel cost / boiler efficiency
```

Blowdown volume is set by chemistry: the boiler concentrates dissolved solids as it makes steam, and blowdown
is what holds the concentration at the limit. More cycles of concentration means less blowdown, so water
treatment and blowdown rate are the same decision, and a plant running 5 cycles blows down twice as much as one
running 9.

The heat recovery has two stages and both are worth taking. When high-pressure blowdown is let down to a flash
tank, a meaningful fraction flashes to steam that can go straight to the deaerator, displacing live steam
(`deaerator-steam-demand`). The liquid that remains is still near boiling and goes through a heat exchanger to
preheat makeup water. Together they routinely recover most of the energy in the blowdown stream, with payback
measured in months on a plant of any size.

The other reason to compute it is that continuous blowdown control is often mis-set. A plant blowing down on a
manual valve rather than on measured conductivity is usually blowing down too much, and the tile shows what that
costs directly.

**Inputs:** steam rate, cycles of concentration (or feedwater and boiler water TDS), boiler pressure, flash tank pressure, makeup water temperature, boiler efficiency, fuel cost, and operating hours

**Outputs:** the blowdown rate in lb/h and as a percent of steam, the heat in the blowdown stream, the flash steam produced at the flash tank pressure, the heat recoverable to makeup water, the annual saving, and the blowdown rate at an alternative cycles of concentration

## 3. Worked example

A boiler making 20,000 lb/h of steam at 5 cycles of concentration:

```
blowdown = 20,000 x 1 / (5 - 1) = 5,000 lb/h = 25% of steam
```

5,000 lb/h leaving at saturation. At 150 psig the saturated liquid carries about 330 BTU/lb above 60 degF
makeup:

```
heat in blowdown = 5,000 x 330 = 1.65 MMBTU/h
at 80% boiler efficiency, $9/MMBTU, 8,000 h/yr:
   $148,500 per year down the drain
```

Recovering 80% of it is worth about $118,800 a year.

Now the chemistry lever. Improve treatment to run 10 cycles instead of 5:

```
blowdown = 20,000 x 1 / (10 - 1) = 2,222 lb/h
```

**Blowdown more than halves** -- 2,778 lb/h less, worth
$82,500 a year on its own, before any heat exchanger is installed. Treatment
first, recovery second.

## 4. Scope and non-goals

A blowdown and heat recovery estimate. The achievable cycles of concentration are set by the boiler water
chemistry limits for the pressure and by the makeup water quality, and pushing cycles beyond what the treatment
program supports causes scale and carryover -- which costs far more than the blowdown saved. Those limits come
from the water treatment specialist and the boiler manufacturer, not from an optimization. It does not size the
flash tank, the heat exchanger, or the blowdown control valve, and it does not address the separate bottom
blowdown that removes sludge and which is not continuous. It does not evaluate discharge temperature limits on
blowdown to sewer, which are commonly regulated. Steam boiler operation is a licensed activity in many
jurisdictions: the boiler manufacturer, the water treatment program, ASME, and the jurisdiction's boiler
inspector govern.
