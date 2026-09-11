# roughlogic.com Specification v1786 -- Brewery Packaging Yield and Loss (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Between the brite tank and the loading dock a brewery loses a few percent to transfers and fills, and then abandons a partial keg because kegs come in one size. That remainder is the cheapest loss to recover and the one no log sheet records.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive starting volume or package size, a loss fraction outside 0 to 1, or a package size larger than the starting volume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the packaging volume balance and standard US keg sizes with the brewery's own measured packaging losses named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`brewery packaging yield`, `keg fill loss`, `beer loss percentage packaging`, `barrels sold per batch`, `brite tank to keg yield`.

## 2. The tile

### 2.1 `packaging-yield-loss` -- Brewery Packaging Yield and Loss

```
starting volume  the brite or bright tank volume, after fermentation and any
                 filtration or centrifugation losses
transfer loss    line fill, tank heel, and the push, commonly 1 to 3% per move
fill loss        foam, purge, and the fill-head return at the keg or can line
whole packages   floor(volume / package size); a partial package is NOT saleable
remainder        the beer left after the last whole package; it is a discrete loss,
                 it is invisible in a percentage, and it does not scale with batch
saleable         whole packages x package size
total loss       starting volume - saleable, which is the number that should be
                 tracked rather than the individual percentages
half barrel      15.5 US gal; a sixth barrel is 5.16 gal, a quarter 7.75
```

Percentage losses and the remainder are different in kind, and only one of them is cheap to fix. Transfer and
fill losses scale with the batch and are reduced only by changing the process -- shorter lines, a better push,
a different filler. The remainder does not scale at all; it is whatever is left after the last whole package,
so on a small batch it can dwarf every percentage loss combined, and it is recovered by putting a smaller
package under the filler rather than by changing anything. Two breweries with identical process losses can
have different yields purely from how their batch sizes divide by their package sizes.

That makes package mix a yield decision. A batch that leaves a substantial remainder in half barrels may leave
almost none if the last of it goes into sixth barrels, so a cellar with a mixed keg fleet recovers beer that a
single-size fleet throws away. The same logic drives the decision to run a short can date at the end of a
packaging run.

Every gallon lost after fermentation is the most expensive beer in the building. It has carried the full grain
bill, the full hop bill, the full energy of the brew day, the fermentation time, the tank occupancy, and in
many cases the excise liability. Losses upstream are cheap and losses at the packaging line are not, which is
the opposite of where most attention goes.

**Inputs:** the starting brite volume, the transfer and fill loss percentages, the package size, the number of package sizes available, and the revenue per package

**Outputs:** the volume after each loss, the whole packages filled, the remainder volume, the saleable volume, the total loss in gallons and as a percentage, the remainder expressed as a share of the total loss, and the revenue at the entered price

## 3. Worked example

A 310 gal brite tank going to half barrels:

```
after transfer (2%) = 310 x 0.98 = 303.80 gal
after fill (1.5%)     = 303.80 x 0.985 = 299.24 gal
whole kegs         = floor(299.24 / 15.5) = 19
remainder          = 299.24 - 19 x 15.5 = 4.74 gal
saleable           = 19 x 15.5 = 294.5 gal
```

**19 kegs out of a 310 gallon tank, and 15.5 gallons gone.** That is 5.0 percent of the batch -- but
look at where it went:

```
transfer + fill = 10.76 gal
remainder       = 4.74 gal
```

**The remainder alone is 31 percent of the total loss**, and it is the one nobody logs. The percentage
losses are process; the remainder is arithmetic, and **it is 0.31 of a keg of finished, taxed, saleable beer
poured down a drain because kegs come in one size.**

**A mixed keg fleet recovers most of it.** The 4.74 gal remainder holds 0 sixth barrels at 5.16 gal,
recovering 0.00 gal and leaving only 4.74 gal behind -- **0 percent of the remainder saved, with no
change to the process at all.**

**At $175 a keg the batch is worth $3,325.** The percentage losses cost $121 and the remainder
$54 -- so the process losses are the larger number, **but they are the ones that need a capital
project, and the remainder needs a sixth-barrel keg.** That is why yield is tracked in whole packages: the
percentage tells a brewery how it is doing, and the remainder tells it what to do this afternoon.

## 4. Scope and non-goals

A yield accounting calculation. The loss percentages are entered and are properties of a particular cellar's line lengths, tank geometry, push method, and filler, and they must be established by measurement rather than assumed -- a brewery's own packaging records are the only source. It does not address the losses upstream of the brite tank: trub and whirlpool, yeast and the fermenter cone, dry hop absorption (`dry-hop-beer-loss`), and filtration or centrifugation all reduce the volume before this calculation starts. It does not model dissolved oxygen pickup, carbonation loss, or fill-level variation at the filler, which are quality rather than yield questions but are what most packaging attention is actually spent on. It does not address the excise treatment of losses, which is regulated and depends on where and how the beer was lost, or the deposit, tracking, and cleaning economics of the keg fleet itself. The brewery's own measured packaging losses, the applicable excise regulations, and the packaging manager govern.
