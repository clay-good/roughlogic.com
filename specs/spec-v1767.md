# roughlogic.com Specification v1767 -- Coating Breakdown Factor and End-of-Life Current (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A cathodic protection system is sized for the current the structure will need at the end of its design life, not the day it is commissioned. The coating breakdown factor is how that growth is expressed, and the ratio between the first year and the last is far larger than most sizing conversations assume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, current density, or design life, an initial factor outside 0 to 1, or a negative degradation rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the linear coating-breakdown convention and the current-demand relation with NACE / AMPP practice and the applicable design standard named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`coating breakdown factor`, `cp current end of life`, `coating degradation cp design`, `mean current demand cathodic`, `cp design life current growth`.

## 2. The tile

### 2.1 `coating-breakdown-factor` -- Coating Breakdown Factor and End-of-Life Current

```
breakdown factor f(t) = a + b t, the fraction of the surface behaving as BARE at
                 time t; a is the initial defect fraction, b the annual degradation
current          I(t) = surface area x f(t) x bare-steel current density
                 (`cathodic-anode-count-life` takes that density as an input)
initial          I(0) = area x a x j -- what the system draws on commissioning
final            I(life) = area x f(life) x j -- what the anodes must still deliver
mean             I_mean uses f at the mid-life value, a + b x life / 2; it is the
                 figure anode MASS is sized on
cap              f cannot exceed 1.0; once the coating is fully broken down the
                 structure is bare and the demand stops growing
the trap         sizing on I(0) produces a system that is correct for a year and
                 hopelessly undersized for the other twenty-nine
```

Two different currents size two different things and conflating them is the classic error. Anode mass is
consumed over the whole life, so it is sized on the MEAN current -- the average demand integrated across the
years. Anode number and rectifier capacity have to deliver the peak, so they are sized on the FINAL current.
A design that uses the mean for both runs out of output before it runs out of anode, and one that uses the
final for both buys far more anode metal than it will ever consume.

The initial current is the one figure that sizes nothing, and it is the one most often measured and quoted.
It is useful for commissioning -- it tells the technician what to expect when the rectifier is first energised
-- and it is a trap in design, because a new coating is very good and the demand it produces bears no
relation to the demand the system exists to meet decades later.

The linear model is a convention rather than a physical law, and it should be read that way. Real coatings do
not degrade on a straight line: they fail slowly, then faster, and the rate depends on the coating system, the
soil or water, the temperature, the quality of the application, and the mechanical damage taken during
installation. The linear factors in the standards are a conservative envelope chosen so that a design is not
wrong, not a prediction of a particular pipeline's future.

**Inputs:** the surface area, the bare-steel current density, the initial breakdown factor, the annual degradation rate, the design life, and optionally a faster degradation rate for comparison

**Outputs:** the breakdown factor at the end of life and at mid-life, the initial current, the final current, the mean current, the ratio of final to initial, the year at which the factor reaches fully bare, and the final current at the alternative degradation rate

## 3. Worked example

A 50,000 sq ft structure at 2 mA per square foot of bare steel, a 2% initial defect fraction degrading at
2% per year over a 30 year design life:

```
f(0)   = 0.02
f(30)  = 0.02 + 0.02 x 30 = 0.62
f_mean = 0.02 + 0.02 x 30 / 2 = 0.32

I(0)    = 50,000 x 0.02 x 2 mA = 2.0 A
I(30)   = 50,000 x 0.62 x 2 mA = 62.0 A
I_mean  = 50,000 x 0.32 x 2 mA = 32.0 A
```

**2 A on day one and 62 A at year 30 -- a factor of 31.** A rectifier and anode bed sized on the
commissioning current would be at **3 percent of the required output** by the end of the design life, and the
failure would arrive gradually enough that nobody could name the day it happened.

**The mean is what buys anode metal, and it is a different number again.** 32 A is the average draw, so anode
consumption is sized on 32 A while anode COUNT and rectifier capacity are sized on 62 A. **Using 32 A for
both leaves the system 48 percent short of output at end of life**; using 62 A for both buys
1.94 times the anode mass that will ever be consumed.

**Degrade twice as fast and the coating runs out entirely.** At 4% per year:

```
f(30) = 0.02 + 0.04 x 30 = 1.22, capped at 1.00
I(30) = 50,000 x 1.00 x 2 mA = 100 A
```

The factor reaches fully bare at year 24.5 and stops growing there, because a structure cannot become more
than completely uncoated. **100 A is the bare-steel demand**, and it is the ceiling any impressed-current design
is ultimately bounded by. At the slower 2% rate the structure would not reach it until year 49.

**This is the number that justifies rectifier headroom** (`cp-rectifier-sizing`). Capacity bought at
commissioning costs a little; capacity discovered to be missing in year twenty costs a new bed.

## 4. Scope and non-goals

A design-current estimate on a linear degradation convention. The breakdown factors are entered and they are the whole answer: the values in the standards are conservative envelopes for broad coating categories in broad environments, not predictions for a particular structure, and a real coating degrades non-linearly at a rate set by its system, its application quality, the installation damage it took, and its service environment. The bare-steel current density is likewise entered and varies widely with soil or water resistivity, oxygen availability, temperature, and microbiological activity. It does not compute anode count, mass, or life (`cathodic-anode-count-life`), size the bed (`anode-bed-resistance`) or the rectifier (`cp-rectifier-sizing`), or address current distribution along the structure (`pipeline-potential-attenuation`). It takes no position on whether a coating should be repaired or replaced rather than protected, which is usually the better economics once the factor is large. NACE / AMPP practice, the applicable design standard, the coating manufacturer's data, and a qualified corrosion engineer govern.
