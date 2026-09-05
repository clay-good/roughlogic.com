# roughlogic.com Specification v1690 -- Abatement Containment Negative Air and Air Changes (`calc-demo.js`, Group D Water Damage and Mold Restoration, abatement, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-demo.js`**
> (Group D, Water Damage and Mold Restoration -- the existing category, hub `/groups/restoration/`; abatement and demolition), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A containment is held under negative pressure and flushed at a defined air change rate, and both numbers have to be met at once. The airflow comes off the volume and the required changes, and the pressure comes off the leakage -- and a containment that meets one and not the other has failed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive containment volume, air change rate, or machine capacity, or a pressure differential at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the air change and negative pressure requirements with OSHA 1926.1101 and the applicable state asbestos program named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`negative air machine sizing`, `containment air changes`, `asbestos containment cfm`, `negative pressure 0.02 differential`, `hepa unit count abatement`.

## 2. The tile

### 2.1 `negative-air-ach` -- Abatement Containment Negative Air and Air Changes

```
airflow required   CFM = volume x ACH / 60
air changes        commonly 4 ACH for asbestos containment; the applicable standard governs
negative pressure  commonly 0.02 in wc relative to the surrounding area, monitored
                   continuously and recorded
unit capacity      negative air machines are rated at a clean-filter airflow; capacity
                   falls as HEPA filters load
makeup             air must be able to enter the containment or the pressure exceeds the
                   target and the flow falls short
exhaust            discharged through HEPA filtration to outside where required
```

Two requirements and one system. The air change rate is what dilutes and removes airborne fibre; the negative
pressure is what keeps fibre from leaving through gaps. They are related but not the same, and a containment can
hold a beautiful negative pressure with almost no airflow if it is very tight, or move plenty of air at
inadequate pressure if it is leaky. Both are measured and both are recorded.

Machine capacity is the term that erodes during the job. Negative air machines are rated at clean-filter
conditions, and as the HEPA loads its airflow falls -- so a containment that started at 4 ACH is at 3 a week later
with no visible change and no alarm. Monitoring the pressure differential catches the pressure side; only
measuring or trending the airflow catches the change rate.

The makeup air point is counterintuitive and practical. A containment sealed too tightly starves the machines: the
pressure differential goes deep, the airflow collapses, and the poly sheeting sucks in. Controlled makeup
openings are what let the system move its design airflow at its design pressure, and adding them is usually the
fix when the manometer reads high and the machines sound loaded.

**Inputs:** containment dimensions and volume, the required air changes per hour, the required negative pressure differential, the negative air machine rated capacity and its derated capacity with loaded filters, and the number of machines

**Outputs:** the airflow required for the entered air change rate, the number of machines at their rated and derated capacity, the achieved air changes at the derated capacity, the machine count needed to maintain the rate with loaded filters, and the makeup opening area implied

## 3. Worked example

A containment 40 by 30 by 20 ft (24,000 cu ft) at 4 air changes per hour:

```
CFM = 24,000 x 4 / 60 = 1,600 cfm
```

With machines rated 2,000 cfm clean:

```
machines = 1,600 / 2,000 = 0.8 -> 1 machines
```

**Now derate for loaded filters.** A HEPA at mid-life may pass 1,400 cfm rather than 2,000:

```
actual airflow = 1 x 1,400 = 1,400 cfm
actual ACH     = 1,400 x 60 / 24,000 = 3.5
```

**3.5 air changes**, below the 4 required, on a containment that was set up
correctly and has not been touched. Sizing on clean-filter ratings and never re-checking is how a compliant
containment quietly stops being one.

The fix is a spare machine in the count, or filter changes on a schedule rather than on symptoms.

**And the makeup air.** If this containment is sealed so tightly that the machines cannot draw 1,600 cfm, the
manometer will read a deep negative -- which looks like success -- while the actual airflow and air change rate
are well below target. Controlled makeup openings raise the flow and bring the pressure back to the 0.02 in wc
target, and both requirements are then met.

## 4. Scope and non-goals

An airflow calculation. The required air change rate, the negative pressure differential, the monitoring and
recording requirements, and the containment construction are set by the applicable regulation and by the project
specification -- OSHA 1926.1101 for asbestos, EPA and state asbestos rules, the EPA Renovation, Repair and
Painting rule and state programs for lead, and others -- and those govern rather than the common values used
here. It does not design a containment, address decontamination unit requirements, critical barriers, negative
pressure monitoring and alarms, or the exhaust discharge location and filtration. It does not address air
monitoring, which is the measurement that actually establishes whether the containment is working, or clearance
criteria. Abatement is licensed work with mandatory training, medical surveillance, and respiratory protection:
the applicable federal and state regulations, the project design, and the licensed contractor and project
monitor govern.
