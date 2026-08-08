# roughlogic.com Specification v1262 -- Chi-Square Test of Independence (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module or dependency (reuses the `chi2Cdf` helper already imported from `pure-math.js`). Inherits spec.md
> through spec-v1261.md.
>
> **The gap (family-completion).** The chi-square family has only goodness-of-fit (`chi-square-gof`), which compares
> one row of categories against an expected distribution. The test of INDEPENDENCE -- an r x c contingency table of
> two categorical variables -- is a distinct canonical member (different expected-cell construction, different df).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
fewer than two rows, fewer than two columns, ragged rows, negative cells, an all-zero row/column, or a non-string
input returns `{ error }`. Citation discipline (v19/v22): OpenIntro Statistics Ch. 6 (two-way tables),
`GOVERNANCE.education`; the chi-square CDF reuses the bundled helper. **Verified against
`scipy.stats.chi2_contingency` (correction=False).**

## 2. The tile

### 2.1 `chi-square-independence` -- Chi-Square Test of Independence (Contingency Table)

```
Expected:   E[i][j] = row_total_i * col_total_j / N          (counts under independence)
Statistic:  chi2 = sum (observed - expected)^2 / expected
df:         (r - 1)(c - 1)
p:          1 - chi2Cdf(chi2, df)
Effect:     Cramer's V = sqrt(chi2 / (N * min(r-1, c-1)))
```

**Input:** `table_text` -- the r x c contingency table, one row per line, cells separated by spaces or commas.

**Outputs:** chi-square, df, p-value, Cramer's V, row/column counts, N, minimum expected cell, significance flag,
low-expected-cell warning.

## 3. Worked example

2x3 table `10 20 30` / `30 20 10`:

```
all expected = 60 x 40 / 120 = 20;  chi2 = 4 x (10^2/20) = 20.0 on (2-1)(3-1) = 2 df
p = 4.54e-5,  Cramer's V = sqrt(20/(120 x 1)) = 0.408
```

Matches `scipy.stats.chi2_contingency([[10,20,30],[30,20,10]])`: chi2 = 20.0, p = 4.539993e-5, dof = 2. A 2x2
cross-check `20 30` / `30 20` gives chi2 = 4.0, p = 0.0455 (scipy with correction=False).

## 4. Scope and non-goals

No Yates continuity correction (so 2x2 results match scipy's `correction=False`, not its default). Reports THAT the
variables are associated, not the direction or which cells drive it. The chi-square approximation weakens when an
expected cell drops below 5 (flagged); Fisher's exact test is the alternative and is out of scope. A statistics aid;
the study design governs. tools-data.js registry cap raised 315000 -> 330000 B.
