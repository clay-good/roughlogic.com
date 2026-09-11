# roughlogic.com Specification v1783 -- Carbonation Volumes and Head Pressure (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Dissolved carbon dioxide is a function of pressure and temperature together, and the temperature term is the stronger of the two. A cooler that has drifted a few degrees warm delivers flat beer at exactly the pressure that was carbonating it correctly last week.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a temperature outside the correlation's valid range, a negative gauge pressure, or a non-positive target carbonation returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the empirical carbon dioxide solubility relation for beer with the brewery's own measured carbonation and the vessel's pressure rating named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`carbonation volumes co2`, `head pressure carbonation table`, `force carbonation psi`, `draft beer co2 pressure temperature`, `volumes of co2 beer`.

## 2. The tile

### 2.1 `carbonation-volumes-pressure` -- Carbonation Volumes and Head Pressure

```
volumes of CO2   the volumes of gas at standard conditions dissolved in one volume
                 of beer; roughly 2.2 to 2.8 for most styles, higher for wheat
                 beers and lower for cask ales
the relation     V = (P_gauge + 14.695) x k(T) - 0.003342
                 k(T) = 0.01821 + 0.09011 x e^(-(T - 32) / 43.11)
for a target     P_gauge = (V + 0.003342) / k(T) - 14.695
temperature      k falls steeply as temperature rises; the SAME pressure holds much
                 less gas in warm beer
what this is     the equilibrium condition, not a carbonation schedule -- reaching
                 equilibrium takes days at rest
altitude         gauge pressure is referenced to local atmosphere, so a high-altitude
                 cellar needs attention to which pressure is meant
```

Carbonation is a solubility equilibrium and both of its variables have to be stated for the number to mean
anything. A brewery that records the pressure on a tank and not its temperature has recorded half the
condition, and the beer's actual carbonation can be anywhere across a wide band. This is why carbonation
tables are two-dimensional and why cellar temperature is a controlled variable rather than an ambient one.

The temperature term dominates and it works against the operator. Solubility falls as beer warms, so a cooler
drifting up delivers less gas at the same pressure, and the visible symptom -- flat beer -- looks like a gas
problem or a leak. Pushing more pressure to fix it will over-carbonate the beer once the cooler is repaired,
so the correct response is nearly always to fix the temperature.

Equilibrium is not instantaneous and the calculation says nothing about time. Gas has to dissolve through a
surface into a static liquid, which takes days in a tall tank at rest, or minutes through a carbonation stone
with the right surface area. The pressure and temperature set the destination; the method and the agitation
set how long the journey takes, and a tank sampled before it has arrived reads low through no fault of the
setting.

**Inputs:** the beer temperature, either the gauge pressure or the target carbonation in volumes, and optionally a second temperature for comparison

**Outputs:** the carbonation in volumes at the entered pressure and temperature, the gauge pressure required for a target, the carbonation the same pressure delivers at a second temperature, and the pressure that would restore the target there

## 3. Worked example

A brite tank at 38 degF held at 12 psig:

```
k(38)  = 0.01821 + 0.09011 x e^(-(38 - 32) / 43.11) = 0.09661
V      = (12 + 14.695) x 0.09661 - 0.003342 = 2.576 volumes
```

**2.58 volumes, a normal ale carbonation.** To land exactly on 2.6 volumes at the same temperature:

```
P = (2.6 + 0.003342) / 0.09661 - 14.695 = 12.25 psig
```

**12.3 psig.** A quarter of a psi from where the tank already sits, which is why 12 psi at 38 degF is the
setting everyone remembers.

**Now let the cooler drift 7 degF warm, with nothing else touched:**

```
k(45) = 0.08486
V     = (12 + 14.695) x 0.08486 - 0.003342 = 2.262 volumes
```

**2.26 volumes instead of 2.58 -- a 12 percent loss of carbonation from 7 degrees.** The gauge has not moved,
the gas is not leaking, and the beer is flat. **The temperature term did all of it.**

**Restoring the target at the warm temperature takes real pressure:**

```
P = (2.6 + 0.003342) / 0.08486 - 14.695 = 15.98 psig
```

**16.0 psig against 12.3 -- 30 percent more pressure to hold the same carbonation 7 degF warmer.** And
that pressure is the trap: **fix the cooler afterwards without dropping the gas and the beer over-carbonates**,
because at 38 degF and 16.0 psig it will equilibrate to 2.96 volumes. **Chase the temperature, not the
gauge.**

## 4. Scope and non-goals

An equilibrium relation. It is an empirical fit to carbon dioxide solubility in beer and is accurate over ordinary cellar conditions; it is not exact, and beer is not water -- alcohol content, gravity, and dissolved solids all shift solubility slightly. It gives the equilibrium condition and says nothing about the time to reach it, which depends entirely on the method: days at rest in a tall tank, minutes through a properly sized carbonation stone, and anywhere between for an agitated or rolled tank. It assumes pure carbon dioxide in the headspace; nitrogen or a blended gas changes the partial pressure and therefore the result, and a mixed-gas dispense system is a different calculation. It does not balance a draft dispense system, which is a separate problem of line resistance against applied pressure (`draft-beer-line-balance`), size a carbonation stone or its gas supply (`beverage-co2-duration`), or address the pressure rating and relief requirements of the vessel, which are governed by the applicable pressure vessel code. Gauge pressure is referenced to local atmospheric pressure and a high-altitude cellar must be explicit about which pressure is meant. The brewery's own measured carbonation, the vessel's pressure rating, and the brewer govern.
