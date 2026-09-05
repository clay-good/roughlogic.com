# roughlogic.com Specification v1534 -- Vertical Tank Strapping Volume and Gauge Conversion (`calc-oilgas.js`, Group B Plumbing and Gas, oil and gas production, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A gauge tape reads feet and inches of liquid; the ticket needs barrels. The bridge is the tank's barrels-per-inch, and on a custody-transfer tank it comes from a strapping table rather than a formula -- but the formula is what tells a pumper whether the table is plausible and what a level change is worth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank diameter or gauge height, or a gauge height exceeding the shell height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cylindrical tank volume relation with API MPMS and the certified strapping table named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tank strapping table`, `barrels per inch tank`, `gauge to barrels`, `tank volume oil field`, `custody transfer tank gauge`.

## 2. The tile

### 2.1 `tank-strapping-volume` -- Vertical Tank Strapping Volume and Gauge Conversion

```
cylindrical tank   bbl per foot = (pi/4) D^2 / 5.615        (D in feet)
bbl per inch       bbl per foot / 12
volume             V = bbl per inch x gauge height in inches
net volume         gross x temperature correction x S and W deduction
custody transfer   the certified strapping table governs, not this formula
```

A vertical cylindrical tank holds the same volume per inch all the way up, so the arithmetic is one constant
and a multiplication. The value of having it in hand is checking: a pumper who knows the tank is roughly 21
barrels per inch immediately knows a two-inch change is forty barrels, and a ticket that says otherwise is worth
a second look.

For custody transfer the certified strapping table is the legal document and this formula is not a substitute
for it. Real tanks deviate from the ideal cylinder -- shell courses of different thickness, bottom deadwood, an
out-of-round shell, tilt -- and the strapping table captures all of it, which is why it is measured rather than
computed. The formula's role is a sanity check and a planning number, and the tile says so plainly.

Two corrections sit between gross and net and both are money: temperature correction to 60 degF, because oil
expands appreciably, and the deduction for sediment and water.

**Inputs:** tank diameter, shell height, gauge height in feet and inches, and optionally the observed temperature, API gravity, and sediment and water percentage

**Outputs:** the barrels per foot and per inch, the gross volume at the entered gauge, the volume change between an opening and closing gauge, and the net volume after temperature correction and S and W deduction where those are entered

## 3. Worked example

A 30 ft diameter vertical tank gauged at 14.5 ft:

```
bbl per foot = (pi/4) x 30^2 / 5.615 = 125.89 bbl/ft
bbl per inch = 125.89 / 12             = 10.491 bbl/in
gross volume = 125.89 x 14.5            = 1825.4 bbl
```

10.5 barrels an inch, so a run that drops the gauge from 14.5 ft to 9 ft 6 in moved
`125.89 x (14.5 - 9.5)` = 629.4 barrels.

The corrections that follow are not small. At 95 degF observed on 38 API crude the volume correction factor to 60
degF is roughly 0.985, and a 0.5% S and W deduction takes another half percent off:

```
net = 629.4 x 0.985 x 0.995 = 616.9 bbl
```

12.5 barrels of difference between gross and net on one run -- which is why
the correction is on the ticket and not left to the gauge.

## 4. Scope and non-goals

The ideal-cylinder volume relation, as a planning and plausibility check. It is NOT a strapping table and must
not be used for custody transfer, allocation, or any measurement of record: the certified table for the specific
tank, produced by physical strapping to API MPMS methods, is the governing document, and real tanks differ from
the ideal cylinder by amounts that matter at the ticket. It does not handle floating roofs, cone-bottom or
cone-roof geometry near the top and bottom of the shell, internal deadwood, tank tilt, or shell expansion with
temperature. Temperature correction factors must come from the API MPMS tables for the observed gravity and
temperature; the figures used above are illustrative. The certified strapping table, API MPMS, and the purchaser's
measurement procedures govern.
