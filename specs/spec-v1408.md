# roughlogic.com Specification v1408 -- Plasma Cut Time, Consumable Life, and Cost per Part (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes oxy-fuel gas consumption but nothing for plasma, and it computes no consumable cost for either. Whether a plasma job is priced right turns on which of two limits runs out first -- pierces or arc-on hours -- and that comparison is not in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive cut length, cut speed, pierce count, or consumable set cost, or a rated pierce or arc-hour life at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the arc-on time and consumable-life allocation practice for plasma cutting (rated pierces and rated arc hours per consumable set), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `plasma-cut-speed` -- Plasma Cut Time, Consumable Life, and Cost per Part

```
cut time per part = cut length / cut speed
arc-on hours      = cut time x parts
parts by pierces  = rated pierces / pierces per part
parts by arc hours= rated arc hours / arc hours per part
consumable life   = the smaller of the two
cost per part     = consumable set cost / consumable life
```

Plasma consumables -- the electrode and nozzle -- wear two ways, and they are rated two ways. Each pierce blasts
the electrode's hafnium insert, so a set carries a rated number of pierces. Steady cutting erodes it more slowly,
so a set also carries a rated number of arc-on hours. Which limit arrives first depends entirely on the part: a
sheet full of small holes burns pierces, and a long straight rip burns hours.

Reporting both, and naming the one that governs, is what makes the tile useful for quoting. A shop that costs
consumables per pierce will underprice long cuts and a shop that costs them per hour will underprice
hole-intensive ones, and the difference on a production run is real money.

**Inputs:** total cut length per part (in), cut speed (in/min) for the amperage and thickness in use, pierces per
part, consumable set cost, rated pierces per set, rated arc hours per set.

**Outputs:** cut time per part, arc-on hours per part, parts per set by each limit, the governing limit, and
consumable cost per part and per foot of cut.

## 3. Worked example

A part with 240 in of cut and 4 pierces, cut at 40 IPM on a 45 A machine in 1/4 in mild steel, with a $35
consumable set rated 500 pierces or 3 arc hours:

```
cut time per part   = 240 / 40      = 6.0 min = 0.10 arc hours
parts by pierces    = 500 / 4       = 125 parts
parts by arc hours  = 3 / 0.10      = 30 parts   <- governs
cost per part       = 35 / 30       = $1.17
cost per foot of cut= 1.17 / 20 ft  = $0.058
```

Arc hours govern by a factor of four, so the consumable cost on this part is $1.17 and not the $0.28 a
pierce-based estimate would have given. Reverse the part -- a nest of 60 small holes with only 30 in of cut -- and
pierces govern instead: 8 parts per set by pierces against 240 by arc hours, and the consumable cost per part
jumps to $4.38. Same machine, same material, an order of magnitude apart.

## 4. Scope and non-goals

Consumable allocation, not a cutting-parameter table. Cut speed must come from the machine manufacturer's chart
for the specific torch, amperage, material, and thickness -- speed is the single largest input here and it is not
computable from first principles. Rated pierce and arc-hour lives are manufacturer figures achieved under ideal
conditions with correct gas pressure, correct standoff, and proper pierce-height and ramp-down settings; real
life is commonly well under the rating, and consumables damaged by a crash or a bad pierce do not last at all.
The tile does not cost gas, power, labor, or machine time, does not address cut quality, kerf width, bevel, or
dross, and takes no position on the fume extraction and eye protection the process requires. The equipment
manufacturer governs.
