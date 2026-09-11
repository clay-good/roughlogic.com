# roughlogic.com Specification v1776 -- Mash Strike Water Temperature and Thickness (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Mashing in is a thermal mixing problem: hot water meets cool grain and the mixture has to land on a temperature that decides which enzymes work. The strike temperature is solved from an energy balance, and the vessel the mash lands in is the term that is always left out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive grain weight, thickness, or specific heat, or a mash temperature at or below the grain temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the mash energy balance and the specific heat of grain and water with the brewery's own measured offset and the malt supplier's analysis named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mash strike water temperature`, `dough in temperature brewing`, `mash thickness quarts per pound`, `infusion mash calculation`, `strike temp grain bill`.

## 2. The tile

### 2.1 `mash-strike-water` -- Mash Strike Water Temperature and Thickness

```
energy balance   grain heat = water heat:
                 c_grain x G x (T_mash - T_grain) = W_lb x (T_strike - T_mash)
thickness        R in quarts of water per pound of grain; 1.0 to 1.5 is the usual
                 range, and a quart of water weighs about 2.086 lb
strike           T_strike = T_mash + (c_grain / 2.086) x (T_mash - T_grain) / R
                 with grain specific heat about 0.40 Btu/lb-degF, the coefficient
                 is 0.1918, which is where the familiar 0.2 comes from
water volume     gallons = G x R / 4
the vessel       a cold mash tun absorbs heat the balance does not account for;
                 preheating the tun is what removes the term
why it matters   a few degrees moves the enzyme balance: lower favours beta-amylase
                 and a drier beer, higher favours alpha-amylase and a fuller one
```

The mash temperature is not a comfort setting, it is an enzyme selection. Beta-amylase works best in the low
to mid 140s and produces highly fermentable maltose; alpha-amylase works best in the high 150s and leaves
dextrins that survive fermentation as body. A mash landing three degrees off target produces a beer with a
different finishing gravity, a different mouthfeel, and a different alcohol content from the one on the
recipe, and none of it can be corrected afterwards.

The familiar 0.2 in the strike formula is not a magic number and it is worth seeing where it comes from.
Grain's specific heat is about 0.40 Btu per pound per degree, water's is 1.00, and thickness is expressed in
quarts rather than pounds -- so the coefficient is 0.40 divided by the 2.086 pounds in a quart. Knowing the
derivation is what lets a brewer adjust it for an unusual grist or a different thickness convention instead of
trusting a constant.

Thickness changes the sensitivity of the whole operation, not just the volume. A thin mash carries more water
per pound of grain, so the water's thermal mass dominates and the strike temperature sits closer to the mash
target; the mash is also more stable against a cold tun or a slow dough-in. A thick mash needs much hotter
strike water and drifts further for the same disturbance, which is why decoction and step mashing traditions
that work thick are also traditions with careful temperature discipline.

**Inputs:** the grain weight, the mash thickness in quarts per pound, the grain temperature, the target mash temperature, the grain specific heat, and optionally the mash tun weight and specific heat

**Outputs:** the strike water temperature from the exact coefficient and from the rounded 0.2 convention, the strike water volume in gallons, the total mash weight, and the temperature drop an unheated mash tun of the entered mass would cause

## 3. Worked example

A 542 lb grist at 1.25 qt per pound, grain at 68 degF, mashing to 152 degF:

```
water   = 542 x 1.25 / 4 = 169.4 gal = 1,413 lb
T_strike = 152 + (0.40 / 2.086) x (152 - 68) / 1.25
        = 152 + 0.1918 x 67.2 = 164.9 degF
```

**164.9 degF strike water for a 152 degF mash.** The rounded 0.2 convention gives 165.4 degF -- a difference
of 0.6 degF, small enough that the convention is safe and large enough to be worth knowing about when
the thickness is unusual.

**Now the term the formula leaves out.** A stainless mash tun of 180 lb, starting at room temperature, absorbs
heat on the way to 152 degF:

```
tun heat  = 180 lb x 0.12 Btu/lb-degF x 84 degF = 1,814 Btu
water has = 1,413 lb x 1.0 = 1,413 Btu per degF
drop      = 1.28 degF
```

**1.3 degF on a 542 lb commercial mash -- real, and small enough that a brewer who preheats the tun
removes it entirely.**

**On a small batch the same term is the whole problem.** A 10 lb grist at the same thickness carries only
26 lb of water, and a 12 lb vessel absorbs:

```
drop = 12 x 0.12 x 84 / 26 = 4.6 degF
```

**4.6 degF, which is 4 times the commercial figure and enough to move the mash out of its enzyme
band entirely.** The formula is the same; the thermal mass ratio is not. **A small mash must preheat its
vessel, and a large one need not** -- and that is the practical difference between a homebrew calculation and a
brewhouse one.

**This is not the baker's dough-water calculation.** `dough-water-temperature` averages several temperatures
through an N-factor convention and a measured friction factor; this is a two-body energy balance with a
specific heat ratio in it. The two look similar on a page and share no arithmetic.

## 4. Scope and non-goals

A thermal mixing calculation. It does not account for the mash tun's thermal mass unless it is entered, and it cannot know whether the vessel was preheated, how long the dough-in took, or how much heat was lost to the room during it -- all of which move the result and all of which are why brewers measure the mash and adjust rather than trusting the strike figure. Grain specific heat varies with the grist's moisture content and composition and is entered as a constant. It does not address step mashing, decoction, or infusion additions to raise a mash already struck, nor does it design a direct-fired or steam-jacketed tun's heating. It takes no position on which mash temperature a recipe should use, which is a style and fermentability decision, or on mash pH, water chemistry, and the salt additions that govern extract and flavour. The brewery's own measured strike-to-mash offset, the malt supplier's analysis, and the brewer govern.
