# roughlogic.com Specification v1796 -- Recycling Diversion Rate and Residual Contamination (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A diversion rate is usually computed at the collection truck, and a material recovery facility then sends a fifth of the recycling stream to the landfill anyway. The reported rate and the real one differ by the contamination, and the contaminated fraction is paid for twice.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive generation or recycling tonnage, a contamination rate outside 0 to 1, negative fees, or diverted plus disposed tonnage exceeding the generation returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the diversion rate definition and the residual mass balance with the processing facility's sort study and the applicable reporting definitions named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`recycling diversion rate`, `mrf residual contamination`, `true diversion rate calculation`, `inbound contamination recycling`, `recycling residual disposal cost`.

## 2. The tile

### 2.1 `diversion-rate-contamination` -- Recycling Diversion Rate and Residual Contamination

```
reported rate    (recycling + organics tonnage) / total generated, measured at the
                 collection vehicle or the inbound scale
contamination    the fraction of the inbound recycling stream that is not
                 marketable and leaves the facility as residual
residual         inbound recycling x contamination rate, which goes to disposal
true diversion   (recycling x (1 - contamination) + organics) / total generated
double handling  residual pays the processing fee AND the tipping fee, having been
                 collected on a recycling route in the first place
what moves it    single stream collection raises participation and raises
                 contamination; the two effects are not independent
the measurement  contamination is established by a sort study at the facility, not
                 by inspection of the carts
```

Diversion measured at the truck is a measure of what was set out, not of what was recycled, and the difference
is the facility's residual. A community can raise its reported diversion by collecting more material and see
no change at all in the tonnage that actually reaches a mill, because everything added was contamination.
The two numbers diverge quietly and only a sort study reconciles them.

Residual is the most expensive tonnage in the system because it is handled twice on purpose. It rides a
recycling collection route, which costs more per ton than refuse collection; it is tipped at a processing
facility and pays a processing fee; it is sorted, rejected, loaded, and hauled; and then it pays a tipping fee
at the landfill it would have gone to directly. Every step was a deliberate investment in recovering material
that was never recoverable.

The contamination rate is therefore a programme lever rather than a nuisance statistic. Education, cart
tagging, collection method, and the acceptance list all move it, and a few percentage points of improvement is
worth more than the same effort spent raising participation -- because improved participation raises the
inbound tonnage and the contamination together, while reducing contamination improves the true rate and the
cost at once.

**Inputs:** the total tonnage generated, the recycling and organics tonnages, the disposal tonnage, the inbound contamination rate, the processing fee, the tipping fee, and optionally an improved contamination rate

**Outputs:** the reported diversion rate, the residual tonnage, the material actually recovered, the true diversion rate and the overstatement, the double-handling cost of the residual, and the true rate and cost at an improved contamination rate

## 3. Worked example

A community generating 100,000 tons a year, collecting 22,000 recycling and 8,000 organics:

```
reported diversion = (22,000 + 8,000) / 100,000 = 30.0%
```

**30% is the number in the annual report.** Now apply the facility's measured 18% inbound contamination:

```
residual   = 22,000 x 0.18 = 3,960 tons to the landfill
recovered  = 22,000 - 3,960 = 18,040 tons
true rate  = (18,040 + 8,000) / 100,000 = 26.0%
```

**26.0% against a reported 30.0% -- an overstatement of 4.0 percentage points**, or
15 percent of the figure being claimed. Nothing was misreported; the measurement was simply taken at the
truck rather than at the bale.

**The residual is the most expensive tonnage in the system:**

```
3,960 tons x ($75 processing + $45 tipping) = $475,200
```

**$475,200 a year to move 3,960 tons through a recycling facility and then bury them.** That material
was collected on a recycling route, tipped at a processor, sorted, rejected, reloaded, and hauled to the
landfill it would have reached directly for the tipping fee alone.

**Improving contamination beats adding tonnage.** Take the rate from 18% to 8%:

```
residual  = 1,760 tons
true rate = 28.2%
saving    = $264,000 per year
```

**2.2 more percentage points of real diversion and $264,000 saved, with no additional
tonnage collected at all.** Raising participation instead would have added inbound tons and their
contamination together; **reducing contamination improves the rate and the cost in the same move.**

## 4. Scope and non-goals

An accounting calculation. The contamination rate is entered and must come from a sort study or the processing facility's own residual records, not from inspection of carts or from a regional average -- it varies with collection method, acceptance list, season, and the market conditions that decide what is marketable at all, and a material that is recyclable in one market year is residual in the next. It does not address how diversion should be defined for reporting: jurisdictions differ on whether construction debris, organics, beneficial use, waste to energy, and self-hauled material count, and a rate is only comparable against another computed on the same basis. It does not model the facility's sort efficiency, which is separate from inbound contamination -- marketable material lost to the residual line is a different loss from contamination arriving in the cart. It does not address commodity revenue, processing contracts and their contamination clauses, or the generation tonnage itself, which is usually estimated rather than measured. The processing facility's sort study and residual records, the applicable state or local reporting definitions, and the programme manager govern.
