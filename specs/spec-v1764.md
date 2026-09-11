# roughlogic.com Specification v1764 -- Cathodic Protection Rectifier Output Sizing (`calc-corrosion.js`, Group A Electrical, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A rectifier has to push the design current through the anode bed, the cables, and the back voltage of the cell, and `cathodic-anode-count-life` states plainly that it does not size the rectifier's voltage. The anode bed resistance is usually the largest term and the cable is the one most often forgotten.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive current, resistance, or efficiency, a negative cable length or back EMF, or a margin below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ohmic circuit relation and conductor resistance per 1,000 ft with NACE / AMPP practice and the NEC named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cp rectifier sizing`, `cathodic protection rectifier voltage`, `impressed current power supply`, `rectifier dc output selection`, `cp system energy cost`.

## 2. The tile

### 2.1 `cp-rectifier-sizing` -- Cathodic Protection Rectifier Output Sizing

```
circuit          the rectifier drives current through anode bed resistance, cable
                 resistance, and a back voltage; the structure's own resistance to
                 earth is usually negligible beside them
voltage          V = I x (R_bed + R_cable) + back EMF
back EMF         roughly 2 V for the cell's own driving voltage; it does not scale
                 with current and it does not go away
cable            both legs count: positive header to the bed AND negative to the
                 structure, at the conductor's ohms per 1,000 ft
selection        rectifiers come in standard ratings; choose the next size above the
                 design figure with margin, commonly 25 to 50%
tap adjustment   a field rectifier is tapped down to the needed output, so the extra
                 voltage costs nothing until it is used
efficiency       a transformer-rectifier runs roughly 50 to 70% efficient, so the AC
                 bill is well above the DC output
```

A rectifier is sized on voltage, not on current, and that ordering matters. The current comes from the
structure's demand and is settled before the power supply is considered. What the rectifier must then supply
is enough voltage to drive that current through everything in the way, and since the anode bed is usually the
largest resistance in the circuit, the bed design and the rectifier selection are one decision made twice.

The cable is the term that gets dropped and it should not be. A header cable running several hundred feet out
to a remote bed, plus the negative back to the structure, can add a meaningful fraction of an ohm, and at
double-digit amperes that is several volts. It is also the term most likely to grow after commissioning, when
a bed is extended or relocated and nobody revisits the rectifier.

Margin on a rectifier is nearly free and its absence is expensive. A transformer-rectifier is tapped down to
the output actually needed, so buying more voltage than today's circuit requires costs a little capital and no
operating penalty, while a unit that is maxed out on day one has nothing left when the coating degrades and
the current demand climbs (`coating-breakdown-factor`) -- which it certainly will, by a factor that is not
small.

**Inputs:** the design current, the anode bed resistance, the cable lengths and conductor size or resistance per 1,000 ft, the back EMF allowance, the design margin, the rectifier efficiency, and the energy rate

**Outputs:** the cable resistance, the total circuit resistance, the required DC voltage, the design voltage with margin, the DC power output, the AC input power at the entered efficiency, and the annual energy and cost

## 3. Worked example

A 10 A system on the 1.640 ohm bed above, with 500 ft of #4 AWG header and 300 ft of negative:

```
R_cable = (500 + 300) x 0.2485 / 1,000 = 0.1988 ohms
R_total = 1.640 + 0.1988 = 1.8388 ohms
V       = 10 x 1.8388 + 2 = 20.39 V
```

**20.4 V at 10 A.** With a 50 percent margin that is 30.6 V, so a standard **36 V / 15 A** unit is the
selection -- tapped down on commissioning to whatever the circuit actually wants.

**The cable is not a rounding error.** 0.1988 ohms at 10 A is 1.99 V, or **10 percent of the required output**, from a
term that is left out of many desk calculations. Drop it and the rectifier is specified at 18.4 V, which
after margin still lands on the same standard size here -- but on a longer header, or a bed twice as
resistive, it is the difference between a unit that works and one that does not.

**The AC bill is larger than the DC work.** At 204 W of DC output and 60% efficiency:

```
AC input = 204 / 0.60 = 340 W
annual   = 340 W x 8,760 h = 2,977 kWh = $357
```

**$357 a year, continuously, forever** -- because a cathodic protection system that is switched off is not
a cathodic protection system. That figure is the operating case for spending capital on a lower-resistance
bed: every ohm removed from the circuit comes straight off the voltage, and therefore off the bill.

**And the bill is going to rise.** The current demand grows as the coating degrades, and a rectifier chosen
with no headroom has nowhere to go when it does.

## 4. Scope and non-goals

A DC output sizing calculation. It does not size the AC service, the breaker, the disconnect, or the conductors feeding the rectifier, and it does not address the enclosure, grounding, or the hazardous-location classification that a rectifier in a plant environment may require -- those are electrical design under the NEC and the local authority. It does not compute the structure's current requirement (`cathodic-anode-count-life`) or the anode bed resistance (`anode-bed-resistance`), both of which are entered. The back EMF allowance is a convention rather than a measurement and the real figure depends on the anode material and the soil chemistry. It does not address ripple, which matters to interference and to some measurement techniques, rectifier efficiency curves at partial load, or the selection between a conventional transformer-rectifier, a switch-mode unit, and a solar or thermoelectric supply. NACE / AMPP practice, the NEC and the local electrical authority, the rectifier manufacturer's data, and a qualified corrosion engineer govern.
