# roughlogic.com Specification v1825 -- Pretreatment Bath Dragout and Rinse Water (`calc-finishing.js`, Group G Cross-Trade Utilities, metal finishing and galvanizing, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finishing.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Dragout is the solution that leaves a bath on the parts, and it sets both the chemical makeup and the rinse water. Adding counterflow rinse stages cuts the water by a power law, and the first two stages do nearly all of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dragout rate, area, bath volume, or dilution ratio, a bath concentration outside 0 to 1, or a stage count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the dragout mass balance and the counterflow rinse dilution relation with the chemical supplier's data and the applicable discharge permit named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pretreatment dragout rate`, `counterflow rinse water calculation`, `plating rinse stages dilution`, `bath makeup concentrate`, `metal finishing water use`.

## 2. The tile

### 2.1 `pretreatment-bath-dragout` -- Pretreatment Bath Dragout and Rinse Water

```
dragout          the process solution carried out on the parts, in gallons per
                 1,000 sq ft; roughly 0.4 to 2 for well-drained flat work and up
                 to 10 for cupped, threaded, or complex parts
volume           dragout rate x area processed
chemical loss    dragout x bath concentration -- the concentrate that has to be
                 replaced to hold the bath on analysis
bath turnover    bath volume / dragout, the days of production that displace one
                 bath volume by dragout alone
rinse dilution   the ratio by which the dragout must be diluted to leave the part
                 acceptably clean; 1,000:1 is a common target
single rinse     flow = dragout x dilution ratio -- an enormous number
counterflow      N stages in series against the part's travel need
                 flow = dragout x dilution^(1/N)
the power law    each added stage takes the Nth root; going from one stage to two
                 is the single largest saving available
```

Dragout is the master variable of a finishing line and almost every consequence flows from it. It sets the
chemical consumption, because concentrate leaves with it; it sets the rinse water, because that water exists
to dilute it; and it sets the wastewater load and its treatment cost, because everything dragged out ends up
in the rinse and then in the treatment system. Reducing dragout is therefore the one intervention that improves
chemistry cost, water cost, and effluent cost simultaneously.

The remedies for dragout are mechanical and cheap. Longer drain times over the tank, tilting or rotating the
rack so solution runs off rather than pooling, drain boards between tanks, and air knives all return solution
to the bath it came from. A rack designed so parts cup and hold solution can multiply dragout several times
over, and rack design is rarely revisited once a line is running.

Counterflow rinsing is the other lever and its arithmetic is dramatic enough to be worth stating carefully.
Fresh water enters the last rinse and flows backward against the part's travel, so each stage does a fraction
of the dilution and they multiply. The required flow falls as the Nth root of the dilution ratio, which means
the step from one stage to two is enormous, the step from two to three is large, and the step from three to
four is usually not worth the tank space.

**Inputs:** the dragout rate per 1,000 square feet, the area processed, the bath volume and concentration, the required rinse dilution ratio, and the number of counterflow rinse stages

**Outputs:** the dragout volume, the concentrate lost and the makeup required, the bath turnover in days, the rinse flow for a single rinse and for two and three counterflow stages, and the water saved by each added stage

## 3. Worked example

A line processing 20,000 sq ft a day at a dragout of 1.5 gal per 1,000 sq ft:

```
dragout   = 1.5 x 20,000 / 1,000 = 30 gal/day
from a 2,000 gal bath at 5% concentrate:
  concentrate lost = 30 x 0.05 = 1.5 gal/day
  makeup           = 1.5 gal concentrate + 28.5 gal water
  bath turnover    = 2,000 / 30 = 67 days
```

**67 days of production displaces a bath volume by dragout alone**, which is why a well-run bath is
maintained on analysis rather than dumped on a schedule.

**Now rinse it.** To dilute the dragout 1,000:1 with a single rinse tank:

```
flow = 30 x 1,000 = 30,000 gal/day
```

**30,000 gallons a day to rinse 30 gallons of dragout.** No finishing line does this, and the reason
counterflow rinsing is universal is visible in the next two lines:

```
2 stages: 30 x sqrt(1,000)     = 949 gal/day
3 stages: 30 x 1,000^(1/3)     = 300 gal/day
```

**Two stages cut the water by 96.8 percent; three cut it by 99.00 percent.** The step from one tank to two
saves 29,051 gallons a day and the step from two to three saves 649 more -- **substantial, and an order of
magnitude less than the first step.** A fourth stage saves 131 gallons a day and costs a tank, floor
space, and another transfer. **The power law is why lines are built with two or three rinses and almost never
with five.**

**And the cheapest gallon is the one never dragged out.** Longer drain time over the tank, a rack that lets
solution run off instead of cupping, drain boards, and air knives return solution to the bath -- **which
reduces the chemical loss, the rinse water, and the effluent load at once**, because all three are proportional
to the same number.

## 4. Scope and non-goals

A mass-balance estimate. The dragout rate is entered and is the whole answer: it must be measured for the actual parts, racks, and drain practice -- weighing racked parts wet and dry over the tank is the usual method -- and it varies by an order of magnitude between well-drained flat work and cupped or threaded parts. The counterflow relation assumes ideal mixing in each stage, complete carry-over between stages, and steady state, and real rinses fall short of all three, so the flows here are a lower bound. It does not address rinse water quality requirements, which differ between a pre-plate rinse and a final rinse where deionised water may be required, or conductivity-controlled rinse flow, which is how a real line modulates water use. It does not design the treatment system, address dragout recovery and return to the bath, evaporation rates, or the chemistry of the bath itself and how it is controlled on analysis. It takes no position on discharge permits, pretreatment standards, or the metal-finishing effluent guidelines, which govern what may leave the site. The chemical supplier's data, the applicable discharge permit and effluent guidelines, and the finishing line engineer govern.
