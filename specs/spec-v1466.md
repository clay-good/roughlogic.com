# roughlogic.com Specification v1466 -- Watt-Hour Meter CT / PT Multiplier (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A transformer-rated meter does not read energy, it reads a scaled fraction of it, and the multiplier that converts the register to real kWh is the product of two ratios and a register constant. A wrong multiplier is a billing error that runs undetected for years, in either direction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive primary or secondary rating on either instrument transformer, or a non-positive register constant returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the transformer-rated metering multiplier relation with ANSI C12.1 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`meter multiplier`, `ct pt ratio meter`, `transformer rated meter`, `billing multiplier kwh`, `instrument transformer ratio`.

## 2. The tile

### 2.1 `meter-ct-pt-multiplier` -- Watt-Hour Meter CT / PT Multiplier

```
CT ratio   CTR = I_primary / I_secondary
PT ratio   PTR = V_primary / V_secondary
multiplier M = CTR x PTR x K_register
billed     kWh = register reading x M
```

The multiplier is a pure product and that is exactly why it goes wrong: swapping a 200:5 CT for a 400:5 during
a load upgrade doubles the correct multiplier, and if the multiplier in the billing system is not changed with it
the customer is billed half. The same happens with a PT changed on a voltage conversion. Neither error announces
itself, because the meter keeps working and the register keeps advancing.

The check that catches it is dimensional rather than clerical: compute the load the multiplier implies at the
metered demand and compare it with the transformer size and the service conductor. A multiplier off by a factor
of two puts the implied load somewhere the service physically cannot go, and that discrepancy is visible in one
line of arithmetic.

**Inputs:** CT primary and secondary current ratings, PT primary and secondary voltage ratings, the register constant, and the register reading or metered demand

**Outputs:** the CT ratio, PT ratio, overall multiplier, billed kWh from the register reading, the implied primary demand, and the implied current for a plausibility check against the service

## 3. Worked example

A 200:5 CT and a 7200:120 PT on a self-contained register with a constant of 1.0:

```
CTR = 200 / 5     = 40
PTR = 7200 / 120  = 60
M   = 40 x 60 x 1.0 = 2,400
```

A register reading of 1,480 kWh bills as `1,480 x 2,400` = 3,552,000 kWh. Now the plausibility check: if the
demand register reads 4.1 kW, the real demand is `4.1 x 2,400` = 9,840 kW, which at 12.47 kV
three-phase is 456 A -- comfortably inside a 200 A CT and consistent with the service.

Swap that CT to 400:5 without updating the record and the correct multiplier becomes 4,800; every bill
written on 2,400 then undercharges by half, indefinitely.

## 4. Scope and non-goals

The multiplier arithmetic for a transformer-rated installation. It does not verify instrument transformer
accuracy class, burden, or polarity -- a reversed CT polarity or a phase swapped against its PT produces a wrong
reading that no multiplier fixes -- and it does not detect a meter wired to the wrong phase or a shorted CT
secondary, which are the field failures. Ratio-correction and phase-angle-correction factors from the instrument
transformer test report are not applied. Transformer-loss compensation, used where metering is on the low side of
a customer-owned transformer, is a separate adjustment. ANSI C12.1, the instrument transformer test reports, and
the utility's metering standard govern.
