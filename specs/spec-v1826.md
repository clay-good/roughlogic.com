# roughlogic.com Specification v1826 -- Galvanising Kettle Immersion Cycle and Throughput (`calc-finishing.js`, Group G Cross-Trade Utilities, metal finishing and galvanizing, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finishing.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A galvanising kettle's output is set by the crane cycle or by the burner, and which one governs depends on what is being dipped. Heavy sections give more tons per hour by the crane and can demand more heat than the kettle can deliver.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive cycle element, load per lift, surface area per ton, specific heat, or burner output, or a bath temperature at or below ambient returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the kettle cycle throughput relation and the sensible heat demand of the steel with the galvanizer's own cycle records and ASTM A123 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`galvanizing kettle throughput`, `immersion time hot dip`, `kettle cycle time crane`, `galvanizing heat load steel`, `tons per hour galvanizing`.

## 2. The tile

### 2.1 `galvanize-kettle-throughput` -- Galvanising Kettle Immersion Cycle and Throughput

```
the cycle        lower + immerse + withdraw and drain + travel back, per lift
immersion time   until the steel reaches bath temperature and the reaction is
                 complete; minutes for light sections, far longer for heavy ones
lifts per hour   60 / cycle time in minutes
throughput       lifts per hour x pounds per lift
area throughput  the same, converted through surface area per ton -- and it
                 answers a DIFFERENT question from tons per hour
heat demand      lb/h x 0.12 Btu/lb-degF x (bath temperature - ambient); this is
                 the heat the burners must put into the steel
the governing    the LOWER of the crane throughput and the heat-limited throughput
constraint       -- and on heavy work it is usually the burners
what heat limits heat-limited output = burner output to the steel / (0.12 x dT)
```

A kettle is two machines in series and they have different limits. The crane is a handling machine whose rate
is set by the cycle; the kettle is a thermal machine whose rate is set by how fast the burners can put heat
into steel. Light work loads the crane and leaves the burners idle; heavy work loads the burners and leaves
the crane waiting. A galvanizer scheduling a day's work is balancing between the two, and quoting a single
tons-per-hour figure for the plant hides which one is binding.

Tons per hour and square feet per hour disagree, and both are real. Heavy sections deliver more weight per
lift than their longer immersion costs, so tons per hour rises with section weight. Surface area per lift does
not rise as fast, because heavy sections have less area per ton, so area throughput falls. The zinc
consumption, the coating quality, and the kettle's dross generation all follow area (`galvanize-coating-weight`),
while the invoice follows weight.

Immersion time is a thermal requirement rather than a preference, and it cannot be shortened by wanting to. The
steel has to reach bath temperature for the iron-zinc reaction to proceed, and a heavy section carries a great
deal of thermal mass into a bath that is only a few hundred degrees above the reaction threshold. Pulling
early produces a thin or incomplete coating that fails inspection, and pushing the bath hotter to compensate
accelerates kettle wall attack, which is the most expensive failure a galvanizing plant has.

**Inputs:** the lower, immerse, withdraw and travel times, the load per lift, the surface area per ton, the steel specific heat, the bath and ambient temperatures, and the burner heat delivered to the steel

**Outputs:** the cycle time and lifts per hour, the throughput in pounds and tons per hour, the surface area processed per minute, the heat demand, the heat-limited throughput, and which constraint governs

## 3. Worked example

Light angle on a 5 minute immersion, 2,000 lb per lift:

```
cycle  = 1 + 5 + 2 + 2 = 10 min
lifts  = 60 / 10 = 6.0 per hour
output = 6.0 x 2,000 = 12,000 lb/h = 6.0 tons/h
heat   = 12,000 x 0.12 x 760 = 1.09 MMBtu/h
```

**Now heavy structural, 12 minutes in the bath at 6,000 lb per lift:**

```
cycle  = 17 min, lifts = 3.53 per hour
output = 21,176 lb/h = 10.6 tons/h
heat   = 1.93 MMBtu/h
```

**10.6 tons an hour against 6.0 -- the heavy work is 1.8 times the tonnage**, even though each lift
sits in the bath 2.4 times as long. The load per lift grew faster than the cycle did.

**And the area throughput goes the other way:**

```
light: 1.0 ton x 400 sq ft/ton over 10 min = 40 sq ft/min
heavy: 3.0 tons x 120 sq ft/ton over 17 min = 21 sq ft/min
```

**1.9 times the area per minute on the light work.** Zinc consumption, dross generation, and coating
quality all follow area; **the invoice follows weight**, and the two metrics point in opposite directions.

**Now the constraint that actually governs.** If the burners deliver 1.5 MMBtu/h into the steel:

```
heat-limited output = 1,500,000 / (0.12 x 760) = 16,447 lb/h = 8.2 tons/h
```

**The light job at 1.09 MMBtu/h is inside it and the crane governs at 6.0 tons/h.** The heavy job wants
1.93 MMBtu/h, which the kettle cannot deliver -- **so its real output is 8.2 tons/h, not the 10.6 the crane
cycle promised**, a shortfall of 22 percent.

**The remedy is not a hotter bath.** Raising the bath temperature to push heat in faster accelerates attack on
the kettle wall, and **a kettle failure is the most expensive event a galvanising plant has.** The remedy is
burner capacity, or scheduling light and heavy work together so neither machine waits.

## 4. Scope and non-goals

A throughput estimate. Immersion time is entered and is a metallurgical requirement determined by the section thickness, the steel chemistry, the bath temperature, and the coating specification -- the galvanizer establishes it from experience with the product, and a calculated time is not a substitute. Cycle element times vary with the crane, the jig, the rack, and the operator, and a real plant's cycle includes pickling, fluxing, drying, and quenching or passivating stages that this does not touch, any of which can be the line's actual bottleneck. The heat calculation accounts only for heating the steel; a kettle also loses heat through its walls and to the ash and dross, must reheat the zinc the work removes, and evaporates flux, so the burner capacity needed exceeds this figure. It does not address bath chemistry, dross and ash management, kettle wall attack and kettle life, which is the plant's largest capital risk, or the emissions and ventilation the process requires. It takes no position on coating quality, which is what the immersion time and withdrawal rate are actually chosen for. The galvanizer's own cycle and coating records, the kettle and burner manufacturers' data, and ASTM A123 govern.
