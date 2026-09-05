# roughlogic.com Specification v1704 -- Spa Drain Interval and Refill Volume (`calc-water.js`, Group M Water and Wastewater Operations, pool service, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; pool and spa service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A spa's water is a small volume carrying a heavy bather load, and the standard rule of thumb -- gallons divided by three times the daily bathers -- gives the days between drains. It is the calculation that explains why spas need draining and pools do not.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive spa volume or bather count returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the bather-load drain interval convention with the applicable health code named as governing for commercial spas, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`spa drain interval`, `hot tub water change frequency`, `gallons divided by three times bathers`, `spa tds drain`, `when to drain a hot tub`.

## 2. The tile

### 2.1 `spa-drain-interval` -- Spa Drain Interval and Refill Volume

```
drain interval    days = gallons / (3 x average daily bathers)
why               dissolved solids, body oils, and byproducts accumulate; a small volume
                  with a large bather load saturates quickly
TDS               rising total dissolved solids makes sanitizer less effective and water
                  dull and scale-prone
compare to a pool a 20,000 gallon pool with the same bathers has a drain interval measured
                  in years, which is why pools are not drained on a schedule
commercial        health codes commonly require far more frequent draining and continuous
                  monitoring, independent of this rule
```

The formula is a bather-load rule and its shape is what makes the point: the interval is proportional to volume
and inversely proportional to use. A spa is two orders of magnitude smaller than a pool and often carries a
comparable number of bathers per session, so its water reaches saturation with dissolved material in weeks where
a pool takes years. That is the entire reason spa maintenance looks so different from pool maintenance.

The mechanism is accumulation of things that do not leave. Sanitizer oxidizes organics but the residue -- salts,
minerals from make-up water, and the byproducts of oxidation itself -- stays in the water and concentrates.
Rising total dissolved solids makes the sanitizer work less effectively and makes the water dull, scale-prone, and
harder to balance, and no amount of chemistry replaces water.

The rule is a starting point rather than a standard. A lightly used residential spa with careful chemistry can
go longer; a heavily used one, or one with high-TDS fill water, needs draining sooner. Testing total dissolved
solids against the fill water's TDS is the measurement that turns the rule into a decision.

Commercial and public spas are a different regime entirely: health codes impose their own draining, monitoring,
and record requirements, and they are far more stringent than any rule of thumb.

**Inputs:** the spa volume, the average number of bathers per day, the fill water total dissolved solids, the current measured TDS, and any applicable health code requirement

**Outputs:** the drain interval in days and weeks, the days since the last drain against it, the TDS rise above the fill water, the interval at an alternative bather load, and the refill volume and its chemical demand

## 3. Worked example

A 400 gallon spa averaging 6 bathers a day:

```
interval = 400 / (3 x 6) = 22.2 days
```

**About 22 days** -- roughly every three weeks. Drop the use to 2 bathers a day and it stretches to
`400 / 6` = 67 days; raise it to 12 and it falls to 11 days.

**Compare a 20,000 gallon pool** with the same 6 bathers a day:

```
interval = 20,000 / (3 x 6) = 1,111 days = 3.0 years
```

Which is why pools are not drained on a schedule and spas are: the same bather load against a hundred times the
water.

The measurement that confirms it: total dissolved solids. If the fill water is 300 ppm and the spa is reading
1,800 ppm, it has accumulated 1,500 ppm of material that chemistry cannot remove -- sanitizer works less well,
the water is scale-prone, and balancing it becomes a losing exercise. Draining and refilling is the treatment.

The refill: 400 gallons of fresh water needs its own start-up chemistry -- balancing, sanitizer, and adjusting
for the fill water's own hardness and alkalinity -- which is part of the job rather than an afterthought.

And a commercial spa is not on this rule at all. Health codes set their own draining and monitoring requirements
and they are considerably more stringent.

## 4. Scope and non-goals

A rule-of-thumb interval. The gallons-over-three-times-bathers rule is a convention, not a standard, and it
does not account for sanitizer type, water chemistry management, filtration, ozone or UV supplementation, or the
fill water's own dissolved solids -- a spa filled with high-TDS water starts closer to its limit. Measured total
dissolved solids against the fill water is a better basis than any interval. It does not address water chemistry,
sanitizer levels, pH and alkalinity balance, or the Langelier index (`langelier-index`), all of which must be
maintained regardless of the drain interval. It does not address the disinfection and health requirements for
commercial and public spas, which are set by the state or local health code and which include bather load limits,
monitoring, recordkeeping, and their own draining requirements far more stringent than this rule. The applicable
health code, the equipment manufacturer, and the chemical supplier govern.
