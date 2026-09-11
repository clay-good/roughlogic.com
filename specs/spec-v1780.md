# roughlogic.com Specification v1780 -- Beer Colour SRM from the Malt Bill (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Beer colour is predicted from a weighted sum of the malts' colours, then bent by a power law because colour does not keep adding in a straight line. A few pounds of the darkest malt in the grist commonly supply most of the answer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, a non-positive weight or colour for any malt, or an empty grain bill returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Morey colour relation and the malt colour unit convention with the malt supplier's certificate of analysis and a measured beer colour named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`beer color srm`, `morey color equation`, `malt color units`, `lovibond grain color`, `srm from grain bill`.

## 2. The tile

### 2.1 `beer-color-srm` -- Beer Colour SRM from the Malt Bill

```
malt colour units MCU = sum(pounds x malt colour in degrees Lovibond) / gallons
colour            Morey: SRM = 1.4922 x MCU^0.6859
why a power law   colour saturates: adding dark malt to an already dark beer changes
                  the measured colour less and less, and a linear MCU badly
                  over-predicts above about 10
the dark malts    roasted and heavily kilned malts carry colour figures one to two
                  ORDERS OF MAGNITUDE above base malt, so a small weight dominates
degrees Lovibond  the malt's own analysis figure; SRM and Lovibond are close in the
                  pale range and are not the same scale
what it is not    a prediction of flavour, and two beers at the same SRM can taste
                  entirely different
```

The power law exists because colour measurement saturates, and understanding that is what keeps the number
honest. Colour is read as the absorbance of a fixed path length of beer, and as the beer darkens, each
additional increment of colouring matter has less room to change the reading. Malt colour units add linearly
and perceived and measured colour do not, so the exponent bends a straight sum into something that tracks
reality across the range.

The dominance of small dark additions is the most useful practical consequence. A malt at five hundred degrees
Lovibond carries two hundred and fifty times the colour of a two-degree base malt pound for pound, so a
handful of pounds in a grist of hundreds decides the colour of the beer. That is exactly why colour is tuned
with small adjustments to the darkest malt and never by adjusting the base -- and why a scaling error on the
roast malt is far more damaging than the same error on the base.

Accuracy is the thing to be modest about. The Morey relation is one of several fits, they disagree with each
other and with measurement, particularly at the dark end where everything reads as black anyway, and the
result is affected by boil length, kettle caramelisation, water chemistry, oxidation, and filtration -- none
of which appear in a grain bill. It is a formulation aid, and a measured colour on the finished beer is the
only authority.

**Inputs:** each malt's weight and colour in degrees Lovibond, and the batch volume

**Outputs:** the malt colour units, the predicted SRM, the linear MCU figure for comparison, each malt's share of the total colour contribution, and the SRM with a named malt removed

## 3. Worked example

A 310 gal batch from 542 lb of grain:

```
  500 lb base malt      x   2.0 L =   1,000
   30 lb crystal 60      x  60.0 L =   1,800
   12 lb roasted barley  x 500.0 L =   6,000
                              sum =   8,800

MCU = 8,800 / 310 = 28.39
SRM = 1.4922 x 28.39^0.6859 = 14.8
```

**15 SRM -- a deep brown.** Note how far the power law bends the answer: **MCU is 28.4 and SRM is 14.8**, so a
linear reading of malt colour units would have predicted a beer **1.9 times darker than it is.**

**Now look at where the colour came from.** The 12 lb of roasted barley is **2.2% of the grain bill by
weight and 68% of the colour.**

**Take it out and the beer is a different style:**

```
MCU = 9.03   SRM = 6.8
```

**6.8 SRM instead of 14.8** -- an amber beer rather than a brown one, from removing 12 lb out of
542. **A two-pound scaling error on the roast malt moves the colour more than a fifty-pound error on
the base**, which is why the dark malts are weighed on a different scale from the base malt in every brewhouse
that cares about consistency.

## 4. Scope and non-goals

A formulation estimate. The Morey relation is one of several published fits to measured colour and they disagree with one another, particularly above about 20 SRM where the measurement itself loses resolution -- the result should be read as a band, not a value. Malt colour in degrees Lovibond comes from the supplier's analysis and varies between lots and crop years. The relation accounts for the grain bill only: boil length and vigour, kettle caramelisation, wort pH and water chemistry, oxidation, the yeast strain, filtration, and age all move the finished colour, and a long-boiled or highly caramelised wort will read darker than its grain bill predicts. It does not convert reliably between SRM, degrees Lovibond, and EBC outside the pale range, predict flavour or roast character, which are not functions of colour, or address colour adjustments made with extracts or caramel colouring where those are permitted. The malt supplier's certificate of analysis and a measured colour on the finished beer govern.
