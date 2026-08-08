# roughlogic.com Specification v1231 -- Sum-of-the-Years'-Digits Depreciation (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-accounting.js`** (Group R),
> no new module, group, or dependency. Inherits spec.md through spec-v1230.md.
>
> **The gap.** Family-completion: the book-depreciation set (`straight-line-depreciation`,
> `declining-balance-depreciation`, `units-of-production-depr`) has no sum-of-the-years'-digits member -- the third
> canonical accelerated time-based method. The `units-of-production-depr` desc itself frames the family as the
> "activity method the time-based tiles skip"; SYD is the accelerated time-based sibling.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive cost, a salvage at/above cost, or a life below 1 (or above 100)
returns `{ error }`. Citation discipline (v19/v22): GAAP book depreciation, ASC 360, by name, `GOVERNANCE.general`,
distinct from the `macrs-depreciation` tax tile. **No copyrighted table is reproduced** -- first-principles arithmetic.

## 2. The tile

### 2.1 `sum-of-years-digits-depreciation` -- Sum-of-the-Years'-Digits Depreciation (Book)

```
SYD = n(n+1)/2                                        n = useful life (years)
year k depreciation = (cost - salvage) * (n - k + 1) / SYD
accumulated = running sum;  book value = cost - accumulated
```

**Inputs:** cost ($), salvage ($), useful life (yr), year of interest.

**Outputs:** the year's depreciation, accumulated depreciation, and year-end book value (plus the SYD denominator and
the full schedule).

## 3. Worked example

`cost = $50,000, salvage = $5,000, life = 5 yr`:

```
SYD    = 5 x 6 / 2 = 15
Year 1 = 5/15 x $45,000 = $15,000   book $35,000
Year 5 = 1/15 x $45,000 = $3,000    book $5,000 = salvage exactly
```

Schedule: 15,000 / 12,000 / 9,000 / 6,000 / 3,000, summing to the full $45,000 base.

## 4. Scope and non-goals

SYD subtracts salvage first (like straight-line, unlike declining-balance), so no final-year plug is needed. A
GAAP/book method (ASC 360), not tax MACRS. A bookkeeping aid; the accounting policy and tax rules govern.
