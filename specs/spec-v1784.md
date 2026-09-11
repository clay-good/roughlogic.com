# roughlogic.com Specification v1784 -- Fermenter Glycol Cooling Load (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A brewery's glycol plant is almost never sized by fermentation. Crash cooling a full tank in a day is a larger load than the yeast ever produces, and it is the load that arrives when several tanks want it at once.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, surface area, or temperature difference, a final gravity at or above the original gravity, a non-positive crash duration, or a peak share outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the heat of fermentation practice figure and the sensible cooling relation with the equipment manufacturers' data and a refrigeration engineer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fermenter glycol load`, `heat of fermentation cooling`, `crash cooling brewery glycol`, `brewery chiller sizing`, `glycol flow fermenter jacket`.

## 2. The tile

### 2.1 `fermenter-glycol-load` -- Fermenter Glycol Cooling Load

```
heat of          fermentation releases roughly 280 Btu per pound of extract
fermentation     consumed; the extract is (OG - FG) points x gallons / 46
adiabatic rise   Q_total / (beer mass x 0.90 Btu/lb-degF) -- the temperature the
                 tank would reach with no cooling at all, a useful sanity check
fermentation     the total spread over the active days, peaking sharply; the peak
peak load        day commonly carries 30 to 45% of the total
crash cooling    Q = mass x 0.90 x (start - target) / the hours allowed; halving the
                 time doubles the load
ambient gain     jacket and shell gain = area x U x (room - beer), running whenever
                 the tank is cold, which is most of the year
diversity        the plant is sized on what runs SIMULTANEOUSLY, not on the sum of
                 every tank's peak
glycol flow      gpm = Btu/h / (60 x density x specific heat x supply-return dT)
```

Fermentation heat is real and modest, and the adiabatic rise is the way to see both facts at once. A tank left
entirely uncooled would climb tens of degrees, which is why fermentation cannot be left uncooled; spread
across several days, the same energy is a small continuous load that a properly sized jacket handles easily.
The two statements are the same number read over different time bases.

Crash cooling is where the plant is actually sized, and the reason is the clock rather than the energy. The
heat removed to take a tank from fermentation temperature to cold conditioning is comparable to the heat
fermentation released, but the brewery wants it gone in a day rather than a week. Compressing the same energy
into a shorter time multiplies the instantaneous load directly, and a cellar that crashes tanks overnight has
chosen a plant several times larger than one that crashes them over three days.

Diversity is what keeps the plant from being absurd, and it is a scheduling decision disguised as an
engineering one. Sizing for every tank at its peak simultaneously produces a chiller nobody buys; sizing for a
realistic coincidence produces one that works until the cellar schedules three crashes on the same Friday.
The load calculation and the brew schedule are the same conversation, and a brewery that grows its tank count
without revisiting either finds out on the warmest week of the year.

**Inputs:** the batch volume, the original and final gravity, the heat of fermentation, the peak-day share, the crash start and target temperatures and the hours allowed, the tank surface area and jacket U-factor, the cellar temperature, and the glycol properties and supply-return temperature difference

**Outputs:** the extract fermented, the total fermentation heat, the adiabatic temperature rise, the peak fermentation load, the crash cooling load, the ambient gain, the governing peak load, and the glycol flow required

## 3. Worked example

A 310 gal fermenter taken from 1.055 to 1.012:

```
extract  = (55 - 12) x 310 / 46 = 290 lb
Q_total  = 290 x 280 = 81,139 Btu
mass     = 310 x 8.4 = 2,604 lb
adiabatic rise = 81,139 / (2,604 x 0.90) = 34.6 degF
```

**35 degF is what this tank would climb with the glycol off** -- which lands squarely in the 20 to 40 degF
range breweries actually observe, and is the check that the heat of fermentation figure is the right one.

**The peak fermentation load is small:**

```
peak day = 81,139 x 0.40 / 24 h = 1,352 Btu/h
ambient  = 143 sq ft x 0.15 x (70 - 34) = 772 Btu/h
total    = 2,125 Btu/h = 0.18 tons
```

**Now crash the same tank from 68 degF to 34 degF in 24 hours:**

```
Q     = 2,604 x 0.90 x (68 - 34) = 79,682 Btu
rate  = 79,682 / 24 = 3,320 Btu/h
total = 3,320 + 772 = 4,092 Btu/h = 0.34 tons
```

**0.34 tons crashing against 0.18 tons fermenting -- the crash is 1.9 times the load.** A plant sized on
the heat of fermentation is **48 percent short** of what the cellar asks for on the day a tank comes down,
and the shortfall shows up as a crash that takes three days instead of one.

**Halving the crash time doubles it again.** The same tank in 12 hours needs
7,412 Btu/h, or 0.62 tons, **from one fermenter.** The crash schedule, not the brew
schedule, is what sizes the chiller.

**The glycol flow follows:**

```
gpm = 4,092 / (60 x 8.6 lb/gal x 0.90 x 8 degF) = 1.10 gpm
```

**1.1 gpm to one tank at its peak** -- and the pump, the header, and the jacket circuit all have to deliver it
to however many tanks the cellar decides to crash together.

## 4. Scope and non-goals

A load estimate for equipment selection. The heat of fermentation is a practice figure with real spread and it varies with the wort, the strain, and the degree of attenuation; the peak-day share likewise varies with the fermentation profile and is entered rather than predicted. It treats one tank in isolation and does not apply a diversity factor across a cellar, which is the judgement that actually sizes a plant and which depends on the brewery's schedule rather than on arithmetic. It does not size the chiller, the glycol reservoir, the pumps, or the piping, address jacket coverage and the difference between a jacket that wets the cone and one that does not, or account for the glycol concentration's effect on freezing point, viscosity, specific heat, and pump power. It does not address the cold liquor tank, the heat exchanger at knockout, or the cold room, which are usually on the same plant and frequently the larger loads. It takes no position on control -- a tank cooled by a jacket zone thermostat behaves very differently from one on a modulating valve. The equipment manufacturers' data, the brewery's own production schedule, and a refrigeration engineer govern.
