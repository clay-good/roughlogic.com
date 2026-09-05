# roughlogic.com Specification v1622 -- Flow Hood Reading Correction and Diffuser Airflow (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A flow hood placed over a diffuser changes the diffuser's own resistance, so the number on the display is not the airflow that was there before the hood arrived. The correction factor is what turns a reading into a measurement, and skipping it biases an entire balance report.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive reading or correction factor, or a correction factor outside a plausible range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the hood correction factor method with NEBB, AABC, and TABB named as governing balancing procedure, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`flow hood correction factor`, `balometer accuracy`, `diffuser airflow measurement`, `hood back pressure`, `capture hood k factor`.

## 2. The tile

### 2.1 `flow-hood-correction` -- Flow Hood Reading Correction and Diffuser Airflow

```
corrected flow    Q = reading x K
K                 the hood's correction factor for that diffuser type and flow range,
                  from a field comparison against a traverse or from the manufacturer
back pressure     the hood adds resistance, which on a low-pressure system reduces the flow
                  it is trying to measure -- typically reading 5 to 15% low
placement         a hood not sealed to the ceiling reads low; one on a linear slot needs
                  the correct adapter or it reads badly
cross check       a duct traverse (`pitot-traverse-cfm`) is the reference measurement
```

A balancing hood is a resistance in series with the diffuser, and adding resistance to a system reduces the
flow through it. How much depends on how much authority the diffuser had in the first place: on a stiff system
with a lot of pressure available the effect is small; on a soft one -- a long flex run, a nearly closed damper, a
fan riding a flat part of its curve -- it can be large.

The correction factor is therefore not a property of the hood alone. Manufacturers publish factors, and the
better practice is to establish one on the actual system by comparing hood readings against a duct traverse on a
few outlets, then applying it to the rest. A report full of uncorrected readings is systematically low, and
because the error is systematic it does not average out -- it makes the whole system look like it is delivering
less than it is, which sends a balancer chasing a fan problem that does not exist.

The placement failures are simpler and larger. A hood that does not seal to the ceiling leaks and reads low; one
used on a linear slot or a perforated face without the right adapter has an unrepresentative velocity profile
across its sensor grid. Both are worth checking before any correction factor is applied.

**Inputs:** the hood reading, the correction factor for the diffuser type, a reference traverse measurement where available, the design airflow, and the diffuser type and hood adapter used

**Outputs:** the corrected airflow, the correction factor derived from a reference traverse where one is entered, the corrected flow against design as a percentage, the total corrected flow for a set of outlets, and the error the uncorrected reading would have introduced

## 3. Worked example

A hood reading 420 cfm on a ceiling diffuser, with a correction factor of 0.94 established from a traverse
comparison on the same system:

```
corrected = 420 x 0.94 = 395 cfm
```

Against a design of 400 cfm, the corrected value is 99% of design -- acceptable. The uncorrected
reading of 420 would have shown 105%, which looks like an outlet that needs throttling and does
not.

The systematic problem: if that 0.94 factor applies across a system of forty outlets totalling 16,000 cfm read,
the corrected total is 15,040 cfm -- a 960 cfm difference on the report. A balancer working
uncorrected sees a system 6% short of design and starts looking at the fan, the filters, and the
duct, when the entire discrepancy is the instrument.

Establishing the factor is worth the time: traverse three or four representative branches, compare against the
sum of the hood readings on their outlets, and use the ratio. That one exercise calibrates the whole report.

## 4. Scope and non-goals

A correction applied to a reading using a factor the user supplies. Correction factors are specific to the hood,
the diffuser type and size, the flow rate, and the system's available pressure, and a single factor applied
across dissimilar outlets will be wrong on some of them. It does not evaluate whether the hood is being used
correctly -- seal, adapter selection, and whether the outlet's throw pattern is compatible with the hood at all --
which are the larger error sources. It does not address measurement uncertainty, instrument calibration, or the
required calibration interval, all of which a balance report should state. It does not substitute for a duct
traverse where one is required, and on outlets with unusual geometry or high velocity a traverse is the only
defensible measurement. The applicable balancing standard (NEBB, AABC, or TABB), the instrument manufacturer's
correction data, and the balancing contractor's certified technician govern.
