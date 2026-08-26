# roughlogic.com Specification v1417 -- Refrigerant Annual Leak Rate and the EPA Repair Threshold (calc-refrigerant.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has eight refrigerant tiles and none of them touches the number that carries a legal consequence: the annualized leak rate. Whether a system must be repaired within 30 days turns on pounds added over twelve months divided by full charge, compared against a threshold that differs by appliance type, and nothing in the catalog computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive full charge or reporting period, a negative quantity added, or a threshold outside 0-100 percent returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the EPA Section 608 refrigerant management leak-rate calculation and the appliance-type leak-rate thresholds at 40 CFR Part 82 Subpart F, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `refrigerant-leak-rate` -- Refrigerant Annual Leak Rate and the EPA Repair Threshold

```
annualized leak rate = pounds added in the period / full charge x (12 / months in period) x 100
allowed before trigger = threshold percent x full charge
pounds over            = pounds added - allowed
```

The rule is simple arithmetic with real teeth. For an appliance containing 50 pounds or more of refrigerant, the
owner or operator tracks refrigerant added, annualizes it against the **full charge** -- the amount the system is
designed to hold, not what happens to be in it -- and compares the result against the threshold for that appliance
type. The thresholds under 40 CFR Part 82 Subpart F differ by category, with commercial refrigeration and
industrial process refrigeration at higher percentages than comfort cooling and other appliances.

Two details cause most of the errors. **Full charge** must be established and documented, and a system whose full
charge has never been recorded cannot compute a compliant leak rate at all. And the calculation **annualizes**:
adding refrigerant twice in three months is a much higher annual rate than the same pounds spread over a year, and
the shorter the window the more it magnifies.

Exceeding the threshold starts a clock -- leak repairs within a set number of days, verification tests,
and, if the leak cannot be repaired, a retrofit or retirement plan. The tile computes the number that starts it.

**Inputs:** full charge (lb), pounds of refrigerant added, length of the period in months, appliance type and its
threshold percentage.

**Outputs:** annualized leak rate, the threshold that applies, pounds that could have been added before
triggering, pounds over, and whether the threshold is exceeded.

## 3. Worked example

A 200 lb system with 34 lb added over the past twelve months:

```
leak rate = 34 / 200 x (12/12) x 100 = 17.0%
against a 10% threshold: EXCEEDED by 7 percentage points; 20 lb was the allowance, 14 lb over
against a 20% threshold: not exceeded; 40 lb was the allowance
```

The same 34 pounds is a violation on one appliance type and unremarkable on another, which is why identifying the
appliance category correctly is the first step and not a formality. Now shorten the window: if those 34 pounds
went in over **six** months, the annualized rate is 34%, and the system is over even the higher threshold. Nothing
about the leak changed -- only the period it is measured against.

## 4. Scope and non-goals

**A compliance arithmetic aid, not a compliance determination.** Appliance categories, threshold percentages,
repair deadlines, verification-test requirements, and the recordkeeping and reporting obligations are set in
regulation and have been revised more than once; take them from the current 40 CFR Part 82 Subpart F text and
from EPA guidance, not from memory or from this tile. The tile does not determine an appliance's category or its
full charge, does not address the chronically-leaking-appliance reporting provisions, the retrofit-or-retire plan
requirements, or state and local rules that are stricter than the federal ones -- California's refrigerant
management program in particular. Anyone servicing these systems must hold EPA Section 608 certification. The
EPA, the state air authority, and the owner's compliance program govern.
