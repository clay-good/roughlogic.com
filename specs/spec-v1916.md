# roughlogic.com Specification v1916 -- FEMA Debris Load Ticket Eligible Cubic Yards (`calc-debris.js`, Group J Trucking and Logistics, debris management, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-debris.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Debris haulers are paid by the cubic yard on a load ticket, and FEMA's monitoring rules decide how many yards a load is worth: the truck's certified capacity, cut to 85% without a solid tailgate, then the monitor's percent-full call, and a flat half for hand-loaded trucks. `dump-truck-loads` counts loads for earthwork; no tile computes the eligible quantity on a ticket.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive bed dimension returns `{ error }`; an observed percent outside 0-100 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA, *Public Assistance Debris Monitoring Guide* (March 2021), load-call rules (85% maximum of certified capacity without a solid tailgate; automatic 50% reduction for hand-loaded trucks and trailers) and the truck certification instructions, named as the method, FEMA Public Assistance and the applicant's monitoring contract named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`debris load ticket`, `truck certification cubic yards`, `debris monitor load call`, `fema debris truck capacity`, `hand loaded debris 50 percent`.

## 2. The tile

### 2.1 `debris-load-ticket` -- FEMA Debris Load Ticket Eligible Cubic Yards

```
certified capacity   bed length x width x height (ft) / 27 = cy, measured
                     to the top of the sideboards as certified
no solid tailgate    maximum = 85% of certified capacity; the monitor's percent
                     full then applies to that reduced capacity
hand-loaded          automatic 50% reduction on the observed load
load                 eligible cy = capacity basis x observed percent full
cap                  never more than the certified capacity
```

A debris load ticket is a measurement dressed as a percentage. The truck's bed is measured once and certified; every
load is then called by a monitor as a percent of that capacity; and the ticket carries the product. FEMA's guide adds
two reductions that the monitor has to apply without being asked. A truck without a solid tailgate cannot be packed to
its full capacity, so its basis is cut to 85% before the percent-full call is applied. A truck loaded by hand cannot be
packed as densely as one loaded by machine, so its load is halved.

The order of operations matters and the guide spells it out with its own example: a 20 cubic yard truck with no
tailgate becomes a 17 yard basis, and a load called at 85% full is 14.5 yards, while one called at 75% is 12.8 yards. The
tile reproduces those numbers so that a monitor, a hauler, and an applicant can agree on a ticket before it is
disputed, which is where debris reimbursement usually goes wrong.

The tile never credits more than the certified capacity, because an overloaded or heaped truck is not paid for the
heap. It reports each reduction separately so the ticket can be audited line by line.

**Inputs:** the bed length, width, and height (or a certified capacity), whether the truck has a solid tailgate, whether it was hand-loaded, and the observed percent full

**Outputs:** the certified capacity, the capacity basis after the tailgate rule, the eligible cubic yards for the load, and each reduction applied

## 3. Worked example

A dump trailer with a 16.0 x 7.5 x 4.5 ft bed and no solid tailgate:

```
certified   16.0 x 7.5 x 4.5 / 27 = 20.0 cy
basis       20.0 x 0.85 = 17.0 cy
load        called 85% -> 17.0 x 0.85 = 14.5 cy   (guide: 14.5)
            called 75% -> 17.0 x 0.75 = 12.8 cy   (guide: 12.8)
```

**14.5 and 12.8 cubic yards -- the guide's printed values.**

**A 10 cy trailer loaded by hand and called 100% full:** 10 x 1.00 x 0.50 = **5.0 cy eligible.** The crew filled the
trailer; FEMA pays for half of it, because hand-loaded debris is not packed.

## 4. Scope and non-goals

A load-ticket quantity calculator under FEMA's monitoring rules. It does not certify trucks, judge percent full, address weight-based tickets and scale tickets, apply contract unit prices, or determine eligibility of the debris itself (which depends on its source, location, and type). The Public Assistance Program and Policy Guide and the monitoring guide in force at the time of the disaster govern, along with the applicant's contracts. FEMA Public Assistance and the applicant's debris monitoring contract govern.
