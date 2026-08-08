# roughlogic.com Specification v1244 -- Future Value of an Annuity (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-accounting.js`** (Group R),
> no new module, group, or dependency. Inherits spec.md through spec-v1243.md.
>
> **The gap.** The finance set has `loan-amortization` and `upgrade-roi` (which take a rate as given) but no
> time-value-of-money primitive: annuity / sinking-fund / future value / present value are all absent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (calc-accounting is a graduated module -- the compute carries a `dims:` annotation),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: non-finite inputs, a
non-positive payment, a negative rate, fewer than 1 period, or an unknown timing return `{ error }`. Citation
discipline (v19/v22): public-domain time-value-of-money identities and the TILA/Reg Z compounding convention,
`GOVERNANCE.general`. **No table is reproduced.**

## 2. The tile

### 2.1 `future-value-of-annuity` -- Future Value of an Annuity (and Present Value)

```
i = rate_pct / 100   (periodic rate)   n = number of payments
Ordinary:  FV = PMT [((1+i)^n - 1)/i]      PV = PMT [(1-(1+i)^-n)/i]
Annuity-due: multiply each by (1+i)
i = 0:  FV = PV = PMT n
sinking-fund deposit for a target FV:  PMT = FV i / ((1+i)^n - 1)
```

**Inputs:** payment per period ($), interest rate per period (%), number of periods, timing (ordinary / due).

**Outputs:** future value, present value, total contributions, interest earned.

## 3. Worked example

`PMT = $500, i = 0.5%/period, n = 120, ordinary`:

```
FV = 500 [((1.005)^120 - 1)/0.005] = 500 x 163.879 = $81,939.67
PV = 500 [(1 - 1.005^-120)/0.005]  = $45,036.73
contributed = 500 x 120 = $60,000   interest = $21,939.67
```

Cross-checks: the annuity-due version is 81,939.67 x 1.005 = $82,349.37; at 0% the future value is just the $60,000 of
principal; and the sinking-fund deposit for the $81,939.67 target recovers exactly $500.

## 4. Scope and non-goals

The rate must be entered PER PERIOD (divide an annual rate by the periods per year first). A bookkeeping aid; the actual
account terms, compounding convention, and taxes govern.
