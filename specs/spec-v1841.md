# roughlogic.com Specification v1841 -- Fibre Strand Count from Homes Passed and Split Architecture (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** The fibre count in a feeder cable follows from how many homes it serves and how hard the light is split. The spare fibre costs a few percent when the cable is bought and the whole placement cost when it is not.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive living unit count, split ratio, or port count, a negative spare percentage, or an empty standard count list returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the fibre count takeoff and standard cable count convention with the route survey and the operator's construction standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fiber strand count planning`, `homes passed feeder fiber count`, `ftth distribution fiber sizing`, `spare fiber capacity`, `standard fiber cable counts`.

## 2. The tile

### 2.1 `fiber-strand-count-planning` -- Fibre Strand Count from Homes Passed and Split Architecture

```
living units     the homes or businesses the route PASSES, not the ones that
                 subscribe; the plant is built for all of them
feeder fibres    ceil(living units / split ratio) -- one feeder fibre feeds one
                 splitter, and one splitter feeds its ratio of subscribers
                 (`pon-split-loss-budget`)
distribution     ceil(living units / drop terminal ports) -- one fibre per terminal
fibres
spare            20 to 30% is ordinary; the cable is sized above the requirement
                 and rounded UP to a standard count
standard counts  12, 24, 48, 72, 96, 144, 216, 288, 432 -- a cable is bought at
                 one of these, so the spare is partly free
take rate        does NOT reduce the fibre count; it delays lighting splitters,
                 not placing cable
the economics    incremental fibre is a small fraction of the CABLE cost and the
                 cable is a small fraction of the PLACED cost
```

Fibre plant is built once for everyone the route passes, and this is the single most important planning
decision in an outside plant design. Take rate -- how many of those homes actually subscribe -- affects how
many splitters are populated and how many transceivers are bought, and those are deferrable. It does not
affect how much cable goes in the ground, because going back to add cable to a route means doing the
placement again.

Standard cable counts make spare capacity substantially cheaper than it looks. Cable is manufactured in fixed
fibre counts, so a requirement that lands between two of them is rounded up regardless, and the fibres between
the requirement and the next standard count arrive at no additional cost at all. The genuine decision is only
whether to go up one further step, and that step is a fraction of the cable price.

The placement dominates everything, which is what makes the arithmetic lopsided. Trenching, boring, aerial
placement, permits, restoration, and traffic control cost several times the cable itself, and they are
incurred per route rather than per fibre. That is why the incremental cost of a larger count is measured
against the whole placed cost and comes out at a few percent -- and why the cost of returning later is very
nearly the whole thing again.

**Inputs:** the living units passed, the split ratio, the drop terminal port count, the spare percentage, the standard cable counts available, the route length, the cable material cost at two counts, and the placement cost per foot

**Outputs:** the feeder fibres required, the count with spare, the standard cable count selected, the count that would have been selected without spare, the drop terminals and distribution fibres required, and the installed cost at each cable count with the difference as a share of the total

## 3. Worked example

A route passing 2,000 living units on a 1:32 split:

```
feeder fibres = ceil(2,000 / 32) = 63
with 25% spare  = 79
standard count selected = 96
```

**Without the spare the requirement of 63 would have rounded up to 72 anyway**, so
9 fibres arrive free. The real decision is the step from 72 to 96, and here is what it costs:

```
72-count: (1.50 material + 8.00 placement) x 52,800 ft = $501,600
96-count: (1.80 material + 8.00 placement) x 52,800 ft = $517,440
difference = $15,840, or 3.2% of the installed cost
```

**3.2% now, against placing a second cable later** -- which is the 84% of the cost that is placement, incurred
again in full, plus permits, restoration, and traffic control a second time. **The spare is not close to a
marginal decision.**

**On the distribution side:**

```
drop terminals = ceil(2,000 / 8 ports) = 250
distribution fibres with spare = 313
```

**And note what take rate does not do.** If only 40 percent of these homes subscribe in year one, the operator
populates 25 splitters instead of 63 and buys fewer transceivers -- **both deferrable purchases.** The
cable count does not change, **because the cable is in the ground for every home the route passes** and going
back for the rest means placing it again.

## 4. Scope and non-goals

A planning takeoff. It does not design the network: where splitters sit, whether the split is centralised at a cabinet or distributed in stages, how the route is segmented, and how terminals are placed against the actual housing along the route all change the counts materially, and a real design is drawn against a map rather than divided from a total. Living units passed must come from a route survey, and multi-dwelling units, businesses, and future development are counted differently from single homes. It does not address the optical budget the chosen split ratio has to satisfy (`pon-split-loss-budget`), which can rule out a ratio the fibre count arithmetic would prefer. Costs are entered and vary enormously with placement method, ground conditions, permitting, and restoration requirements; the figures here are placeholders for an estimate built from the actual route. It does not address duct and conduit occupancy, pole make-ready, the slack the design also needs (`fiber-slack-storage`), or the record-keeping that lets the spare fibres actually be found and used years later. The route survey, the operator's construction standards, and the outside plant engineer govern.
