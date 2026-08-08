# roughlogic.com Specification v1245 -- Effective Annual Rate (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-accounting.js`** (Group R),
> no new module, group, or dependency. Inherits spec.md through spec-v1244.md.
>
> **The gap.** The finance set (`loan-amortization`, `upgrade-roi`, `future-value-of-annuity`) uses a rate as given but
> never converts compounding bases; APR/APY / effective-annual-rate is absent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (calc-accounting is a graduated module -- the compute carries a `dims:` annotation),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: non-finite inputs, a negative
APR, or an unknown compounding return `{ error }`. Citation discipline (v19/v22): the public-domain compounding identity
and the TILA/Reg Z APY definition (12 CFR 1030), `GOVERNANCE.general`. **No table is reproduced.**

## 2. The tile

### 2.1 `effective-annual-rate` -- Effective Annual Rate (APR to APY)

```
discrete:    EAR = (1 + APR/m)^m - 1        m compounds per year
continuous:  EAR = e^APR - 1
periodic rate = APR / m
inverse:     APR = m [(1 + EAR)^(1/m) - 1]
```

**Inputs:** nominal APR (%), compounding (annual / semiannual / quarterly / monthly / daily / continuous).

**Outputs:** the effective annual rate (APY) and the periodic rate.

## 3. Worked example

`APR = 12%, compounded monthly`:

```
EAR = (1 + 0.12/12)^12 - 1 = 1.01^12 - 1 = 0.126825 = 12.6825%
periodic rate = 0.12 / 12 = 1% per month
```

Cross-checks: annually the EAR equals the 12% nominal; semiannually 12.36%, daily 12.7475%, continuously
e^0.12 - 1 = 12.7497% (the upper bound); the inverse APR = 12[(1.126825)^(1/12) - 1] recovers 12%.

## 4. Scope and non-goals

The APR must be the nominal (stated) annual rate; simple interest and fees (which an APR may or may not fold in) are
separate. A bookkeeping aid; the account disclosure and a CPA govern.
