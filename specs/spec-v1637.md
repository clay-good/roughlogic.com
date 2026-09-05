# roughlogic.com Specification v1637 -- Grease Duct Buildup and Cleaning Interval (NFPA 96) (`calc-kitchen.js`, Group O Kitchen and Food Service, commercial kitchen, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, Kitchen and Food Service -- the existing category, hub `/groups/kitchen/`; commercial kitchen), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Grease duct cleaning frequency is set by how fast grease accumulates, and that depends on what is cooked and how much. NFPA 96 gives inspection intervals by cooking volume and type, and a schedule set by habit rather than by the table is the most common finding in a kitchen fire investigation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive operating hours or grease measurement, or a cooking category outside the defined set returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 96 inspection intervals and grease depth triggers by name with the AHJ named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`grease duct cleaning frequency`, `nfpa 96 inspection interval`, `hood cleaning schedule`, `grease depth trigger`, `kitchen exhaust cleaning`.

## 2. The tile

### 2.1 `grease-duct-cleaning-interval` -- Grease Duct Buildup and Cleaning Interval (NFPA 96)

```
inspection interval  NFPA 96 by cooking volume:
                     solid fuel -- monthly
                     high volume (24 h, charbroiling, wok) -- quarterly
                     moderate volume -- semiannually
                     low volume (churches, seasonal, day camps) -- annually
cleaning trigger     clean when measurable grease is found, regardless of the schedule
depth criterion      commonly 2,000 micrometres (about 0.08 in) triggers cleaning;
                     50 micrometres for a designated inspection point
scope                the ENTIRE system: hood, filters, duct, fan, and the roof discharge
```

The interval is an INSPECTION interval, not a cleaning interval, and that distinction is the one that matters.
The code requires the system to be inspected on a schedule set by cooking volume and fuel, and cleaned whenever
the inspection finds measurable grease -- so a quarterly-inspection kitchen that is producing grease fast may be
cleaned quarterly, and one that is not may not.

The scope is where deficiencies concentrate. Hood and filter cleaning is visible and gets done; the horizontal
duct run, the vertical riser, the fan housing and blades, and the roof discharge area are out of sight, and a
system certified as cleaned with an uncleaned fan is a common and serious finding. The fan in particular
accumulates grease on the wheel where it is both a fuel load and an imbalance.

Solid fuel is a separate category for a reason. Wood and charcoal produce creosote as well as grease and generate
sparks that can ignite it, so the code treats solid-fuel systems more severely -- monthly inspection, separate
ductwork, and additional protection -- and combining solid fuel into a shared duct with other appliances is not
permitted.

**Inputs:** cooking volume category, fuel type, daily operating hours, the measured grease depth at the designated inspection point, and the date of the last inspection and cleaning

**Outputs:** the NFPA 96 inspection interval for the entered category, the next inspection date from the last one, the measured grease depth against the cleaning trigger, a clean-now or schedule verdict, and the system components that must be included in the cleaning scope

## 3. Worked example

A 24-hour operation with charbroiling:

```
category            = high volume
inspection interval = quarterly (every 3 months)
last inspection     = 5 months ago  -> OVERDUE by 2 months
```

And the measurement at the designated inspection point reads 2,400 micrometres:

```
trigger  = 2,000 micrometres
measured = 2,400  -> CLEAN NOW, regardless of schedule
```

The schedule and the measurement both say the same thing here. Where they disagree, **the measurement governs**:
a system inspected on time and found with measurable grease is cleaned on the spot, and a system found clean is
still inspected again at the interval.

The scope trap: a cleaning that addresses the hood, filters, and the first section of duct and leaves the
horizontal run, the riser, the fan wheel and housing, and the roof discharge is not a compliant cleaning, and the
certificate should not be accepted for it. The fan wheel is both the hardest to reach and among the worst places
for grease to accumulate.

Solid fuel changes the answer entirely: a wood-fired oven on this system would move the inspection interval to
monthly and would require its own separate ductwork.

## 4. Scope and non-goals

A schedule and threshold comparison against NFPA 96 provisions the user supplies. The intervals, the cooking
volume categories, the measurement method and the depth triggers are set by the adopted edition of NFPA 96 and by
the AHJ, and jurisdictions amend them; the values used above are the common case and must be confirmed against
the adopted code. It does not perform or certify an inspection or cleaning, which must be done by trained
personnel and documented, and it does not evaluate the many other requirements a kitchen exhaust system carries:
fire suppression system inspection and testing, filter type and installation, duct construction and access panel
provisions, clearance to combustibles, fan hinge kits, and the grease containment at the roof. It does not address
makeup air (`kitchen-makeup-air-deficit`). Kitchen exhaust fires spread through the duct into the structure:
NFPA 96, the adopted fire code, the fire suppression system manufacturer, and the AHJ govern.
