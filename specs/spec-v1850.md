# roughlogic.com Specification v1850 -- Walkway Clearing Crew Productivity (`calc-winterops.js`, Group G Cross-Trade Utilities, snow and ice management, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-winterops.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A walk crew is two different operations running at once, and the slower one sets the time. Both slow down with depth, so a service level that holds at four inches fails at twelve without anyone changing how they work.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, production rate, crew size, service window, or application rate, or a hand-work area exceeding the total returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the parallel-operation crew time convention with the contractor's own production records and the applicable accessibility requirements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`walkway clearing productivity`, `sidewalk snow removal crew size`, `snow blower square feet per hour`, `shovel productivity snow`, `ice melt application walkways`.

## 2. The tile

### 2.1 `walkway-clearing-productivity` -- Walkway Clearing Crew Productivity

```
two operations   open walk with a blower or a sidewalk machine, and steps,
                 landings, and entrances by hand; they run in PARALLEL
crew time        the LARGER of the two, not the sum -- the crew is done when the
                 slower operation is done
blower rate      square feet per hour for a stated depth; it falls steeply with
                 depth and falls further in wet snow
hand rate        square feet per hour per person; commonly a fifth to a tenth of a
                 blower and far more sensitive to depth
balance          the right crew has the two operations finishing together; a crew
                 with the wrong split has one worker waiting
service level    usually stated as hours after the storm ends; the crew time has
                 to fit inside it
crews required   ceil(crew time / the service window)
ice melt         area / 1,000 x the rate per 1,000 sq ft, PER APPLICATION, and a
                 long storm takes several
```

A walk crew is limited by its slowest parallel operation, which makes the split between machine work and hand
work the whole design of the crew. Adding a second blower to a route that is waiting on its shovellers changes
nothing; adding a shoveller changes everything. Crews are commonly sized by habit rather than by balancing the
two, and the symptom is a machine operator standing at the end of the walk waiting.

Depth penalises both operations and it penalises hand work worse. A blower slows because it can only ingest so
much snow per pass and deep snow forces a slower walking speed or a second pass; a shoveller slows because each
scoop is heavier and the lift is higher, and beyond a certain depth the work becomes throwing rather than
pushing. A crew that comfortably meets its service level in a routine event can miss it by a wide margin in a
heavy one, and it is the hand work that fails first.

Service levels on walks are a liability question as much as an operational one, which is why they are usually
written as hours after the storm ends. A walk that was cleared and then refroze is a different and worse
condition than one that was never cleared, so the ice melt application and its re-application through a long
event are part of the same commitment -- and the material is counted per application rather than per storm.

**Inputs:** the total walk area, the split between open walk and hand work, the blower and hand rates at the design depth, the crew size, the depth factors for deeper snow, the service window, and the ice melt rate and application count

**Outputs:** the time for each operation, the crew time as the larger of the two, the same figures at greater depths, whether the service window is met, the crews required, and the ice melt per application and for the event

## 3. Worked example

A 12,000 sq ft walk route: 10,000 sq ft of open walk and 2,000 sq ft of steps and entrances, at
4 in of snow with one blower and 2 shovellers:

```
blower  = 10,000 / 12,000 sq ft/h = 0.83 h
hand    = 2,000 / (2 x 1,200) = 0.83 h
crew    = the larger = 0.83 h = 50 min
```

**50 minutes, and the two operations finish together** -- which is what a balanced crew looks like. Adding a
second blower here would save nothing at all.

**Now 8 in of snow, with both rates halved:**

```
blower = 1.67 h   hand = 1.67 h   crew = 1.67 h = 100 min
```

**100 minutes -- double, and still inside a 2 hour service window.**

**At 12 in of wet snow the blower is at a quarter of its rate and hand work at a third:**

```
blower = 3.33 h   hand = 2.50 h   crew = 3.33 h = 200 min
```

**3.33 hours against a 2 hour window -- the route now fails its service level**, and it fails on the hand
work, which is what degrades fastest. **Meeting the commitment takes 2 crews on this route**, and the
decision has to be made before the storm rather than during it.

**The material is counted per application, not per storm:**

```
12,000 / 1,000 x 4 lb = 48 lb per application
a 6 hour storm re-treated every 2 hours = 3 applications = 144 lb
```

**144 lb for one event on one route.** A walk cleared once and then left to refreeze is a worse condition
than one never cleared, **so the re-application through the storm is part of the same commitment** as the
clearing -- and it is the part most often left out of both the material order and the labour estimate.

## 4. Scope and non-goals

A crew sizing estimate. Production rates are entered and must come from the contractor's own timed records: they vary enormously with snow type and moisture, walk width and surface, the number of doorways, steps, and obstacles, where the snow can be thrown, the equipment, and the crew, and a rate from one property does not transfer to another. The depth factors used here are illustrative rather than measured. It treats the two operations as perfectly parallel and independent, which they are not -- crews interfere, share transport between properties, and lose time moving between them, and travel between properties commonly exceeds the clearing time on a route of small sites. It does not address the sequencing of properties within a route, which is what actually determines whether any individual site meets its window, or the staffing, call-out, and fatigue constraints of a multi-day event. It does not address ice melt selection or its effectiveness at temperature (`ice-melt-working-temperature`), or the accessibility requirements that govern which routes and entrances must be cleared and to what width. It takes no position on slip and fall liability, documentation, or the service contract's own definitions. The contractor's own production records, the applicable accessibility requirements, and the service contract govern.
