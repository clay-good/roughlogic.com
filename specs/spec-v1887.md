# roughlogic.com Specification v1887 -- Responder Base Camp Sanitation and Water (`calc-reliefwater.js`, Group G Cross-Trade Utilities, emergency sanitation, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Utility, line, and debris crews brought in after a disaster often sleep where they work, in tent cities or trailer camps stood up in a parking lot. OSHA's temporary labor camp standard sets the toilets, basins, showers, sleeping space, and water for them, and no tile applies it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative occupant count by sex, or a total below 1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): 29 CFR 1910.142, Temporary labor camps -- paragraphs (b)(2), (c)(2), (c)(4), (d)(3), (d)(5), (d)(6), and (f)(1), federal regulation, public domain -- named as the rule, OSHA, the state plan, and the local health department named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`base camp sanitation`, `temporary labor camp osha`, `responder camp toilets showers`, `tent city water supply`, `crew camp planning`.

## 2. The tile

### 2.1 `responder-camp-sanitation` -- Responder Base Camp Sanitation and Water

```
toilets      per sex, 1 per 15 of that sex, minimum 2 for a shared facility (d)(5)
urinals      1 per 25 men (or 2 linear ft of trough)                      (d)(6)
basins       1 handwash basin per 6 persons in shared facilities       (f)(1)(i)
showers      1 showerhead per 10 persons                              (f)(1)(ii)
laundry      1 tray or tub per 30 persons                            (f)(1)(iii)
fountains    1 drinking fountain per 100 occupants where pressure water (c)(4)
water        35 gal per person per day, delivered at a peak rate of 2.5 x the
             average hourly demand                                         (c)(2)
sleeping     50 sq ft of floor per occupant, 7 ft ceiling                  (b)(2)
distances    toilet room within 200 ft of every sleeping-room door        (d)(3)
```

A camp is a small town, and the standard sizes it like one. The ratios are per person and the tile applies them all
at once, but two details decide the count. Toilets are counted separately for each sex against the maximum number of
that sex the camp is designed to house, with a minimum of two in any shared facility -- so a camp of 100 men and 5
women needs 7 plus 2 = 9, where dividing the whole camp by 15 would give 7. And urinals are in addition to the
men's toilets, not a substitute for them.

The water figure is the one that sizes the infrastructure. Thirty-five gallons per person per day covers drinking,
cooking, bathing, and laundry, and the supply has to deliver it at two and a half times the average hourly rate,
because a camp's demand bunches around the start and end of each shift. The peak rate is what sizes a water trailer's
pump, a temporary line, or the refill schedule of a bladder, and it is the number most often left out when a camp is
planned as so many gallons a day.

The sleeping space is a floor-area number with a spacing rule behind it: 50 square feet per occupant, beds at
least 36 inches apart and 12 inches off the floor. It sets the tent or trailer count, and it is routinely violated
when a camp is filled past its design population during the first days of a response.

**Inputs:** the number of men and women the camp is designed to house, and whether water is under pressure

**Outputs:** the toilets per sex and total, urinals, handwash basins, showerheads, laundry trays, drinking fountains, the daily water volume, the average and peak hourly demand, the sleeping floor area, and the distance rules

## 3. Worked example

A utility restoration camp for 120 line workers, 90 men and 30 women:

```
toilets    men: max(2, ceil(90/15)) = 6    women: max(2, ceil(30/15)) = 2    total 8
urinals    ceil(90/25) = 4
basins     ceil(120/6) = 20      showers  ceil(120/10) = 12
laundry    ceil(120/30) = 4      fountains ceil(120/100) = 2
water      120 x 35 = 4,200 gal/day
           average 175 gal/h, peak 2.5 x 175 = 437.5 gal/h = 7.3 gpm
sleeping   120 x 50 = 6,000 sq ft
```

**Eight toilets, four urinals, twenty basins, twelve showers -- and 4,200 gallons a day delivered at 7.3 gpm peak.**
A 1,500 gallon water trailer refilled once a day does not meet it; three refills do.

**If the women's side had 20 occupants instead of 30,** ceil(20/15) = 2 still, and the minimum of two governs; at 10
women it would be max(2, 1) = 2 -- **the minimum, not the ratio, sets the small side of a camp.**

## 4. Scope and non-goals

A planning aid applying the federal temporary labor camp standard's ratios to a responder or contractor camp. Whether 1910.142 applies to a particular camp is a regulatory question; state plans, local health codes, and agency base-camp standards may be more stringent. It does not address camp siting, drainage, and separation distances beyond those listed, refuse disposal, food service, insect and rodent control, or first aid, all of which the standard also covers. It does not size a camp's power (`generator-sizing`), water storage (`cistern-storage-days`), or wastewater hauling. It does not apply to worksite toilets during the day (`osha-toilet-count`) or to public shelters (`shelter-capacity-sanitation`). 29 CFR 1910.142, the state plan, and the local health department govern.
