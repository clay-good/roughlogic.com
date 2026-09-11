# roughlogic.com Specification v1778 -- Brewhouse Efficiency and Grain Bill (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Brewhouse efficiency is the fraction of the malt's available extract that ends up in the beer, and it is the number a grain bill is scaled by. It is a property of the brewhouse rather than of the recipe, it falls as gravity rises, and it means two different things depending on where the volume is measured.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive grain weight, extract potential, volume, or gravity, or an efficiency outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the extract point-gallon convention and the fine-grind dry-basis extract definition with the malt supplier's certificate of analysis named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`brewhouse efficiency`, `mash efficiency grain bill`, `points per pound per gallon`, `malt extract potential`, `grain bill scaling gravity`.

## 2. The tile

### 2.1 `brewhouse-efficiency` -- Brewhouse Efficiency and Grain Bill

```
potential        each malt has a fine-grind dry-basis extract, quoted in points per
                 pound per gallon; base malt runs near 37, and the MALT ANALYSIS
                 is the source, not a table
available        total point-gallons = sum(pounds x ppg) over the grist
actual           point-gallons = gravity points x volume
efficiency       actual / available
grain for a      G = target points x volume / (ppg x efficiency)
target
where measured   MASH efficiency is taken at the kettle; BREWHOUSE efficiency is
                 taken into the fermenter and is lower by the kettle and whirlpool
                 losses -- the same brew day yields two different numbers
gravity effect   efficiency falls as the grain bill rises, because the sparge rinses
                 a deeper bed less completely (`sparge-water-volume`)
```

Efficiency belongs to the brewhouse, and that is the fact that makes it useful. A given set of vessels, a given
mill gap, and a given lauter technique produce a repeatable number, so once a brewery has measured its own it
can scale any recipe with confidence. A number borrowed from a recipe written on someone else's system is not
a measurement of anything, and it is the usual reason a first brew on new equipment misses its gravity.

The definitional ambiguity is worth pinning down before comparing anything. Efficiency measured at the kettle
credits the brewhouse with extract that is still going to be left behind in the trub and the whirlpool; the
same brew day measured into the fermenter reports several points lower. Both numbers are legitimate and they
are not interchangeable, so a brewery that quotes one and scales with the other will be consistently short.

The gravity dependence is the trap in a recipe scaled up rather than across. A stronger beer needs more grain,
the deeper bed rinses less completely, and the efficiency that held at ordinary gravity does not hold at high
gravity -- so a barleywine scaled on a pale ale's efficiency lands well under its target. Breweries that brew
across a wide gravity range keep an efficiency curve rather than a figure.

**Inputs:** the grain bill with each malt's weight and fine-grind extract potential, the volume and the volume's measurement point, the measured or target original gravity, and optionally the kettle and whirlpool losses

**Outputs:** the total available extract in point-gallons, the actual extract achieved, the efficiency at the entered volume, the efficiency restated into the fermenter after losses, the grain required for a target gravity, and the gravity a second grain bill would reach at the entered and at a reduced efficiency

## 3. Worked example

A 310 gal batch hitting 1.055 from 542 lb of base malt at 37 points per pound per gallon:

```
available  = 542 x 37 = 20,054 point-gallons
actual     = 55 x 310 = 17,050 point-gallons
efficiency = 17,050 / 20,054 = 85.0%
```

**85% measured at the kettle.** Now take the same brew day into the fermenter, 15 gal short after trub
and whirlpool losses:

```
efficiency = 55 x 295 / 20,054 = 80.9%
```

**85% or 81%, from one brew day, depending only on where the volume was measured.** Both are correct. A
brewery that publishes the kettle figure and scales its recipes with it will be **5 percent short of extract
in the fermenter, every time**, and the error is invisible because both numbers come out of the same log sheet.

**Now scale up to a strong beer.** The grist goes to 850 lb in the same 310 gal:

```
at 85% efficiency:  OG = 850 x 37 x 0.8502 / 310 = 86.3 points -> 1.086
at 75% efficiency:  OG = 850 x 37 x 0.75 / 310 = 76.1 points -> 1.076
```

**10 gravity points between the assumption and the reality** -- the difference between a 1.086 beer and a
1.076 one, which is a different beer in a different style with a different alcohol content and a different
excise calculation.

**The extract left in the tun is 3,151 point-gallons, equivalent to 114 lb of malt** -- grain that was
bought, milled, mashed, and then wheeled out wet with the spent grain. **Efficiency is not an abstraction; at
high gravity it is the largest single line item in the brew day's cost.**

## 4. Scope and non-goals

A scaling and accounting calculation. The malt's extract potential is entered and must come from the supplier's certificate of analysis for the lot in hand -- fine-grind dry-basis extract varies between maltsters, between crop years, and between lots, and a table value is a placeholder. Efficiency is a measured property of a particular brewhouse with a particular mill gap, lauter design, and sparge technique, and it is not transferable between systems or, at high gravity, between recipes on the same system. It does not diagnose a low efficiency, whose usual causes -- crush, a set or channelled bed, sparge temperature and pH, mash time and conversion, deadspace -- are operational rather than arithmetic. It does not compute volumes (`sparge-water-volume`), the boil's concentration of gravity (`kettle-boil-off`), or the mash tun's capacity limit (`mash-tun-grain-bed`). It takes no position on recipe formulation or on how efficiency should be defined for reporting. The malt supplier's certificate of analysis and the brewery's own measured efficiency records govern.
