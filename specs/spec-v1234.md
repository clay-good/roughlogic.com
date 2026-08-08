# roughlogic.com Specification v1234 -- Paired (Dependent-Samples) t-Test (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module, group, or dependency. Inherits spec.md through spec-v1233.md.
>
> **The gap.** Family-completion: the stats set has `two-sample-t-test` (Welch, independent groups) but not its direct
> matched-data sibling, the paired t-test.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, fewer than 2 pairs, a negative SD, or differences with no spread return `{ error }`. Citation
discipline (v19/v22): OpenIntro Statistics Chapter 7 (inference for paired data), `GOVERNANCE.general`. The Student-t
CDF reuses the module's bundled `tcdf` helper (the same one `two-sample-t-test`, `pearson-correlation`, and
`linear-regression` use). **No table is reproduced.**

## 2. The tile

### 2.1 `paired-t-test` -- Paired (Dependent-Samples) t-Test

```
t = d_bar / (s_d / sqrt(n))        df = n - 1
p = 2 (1 - tcdf(|t|, df))  (two-sided)  or  1 - tcdf(|t|, df)  (one-sided)
```

where `d_bar` and `s_d` are the mean and standard deviation of the n paired differences.

**Inputs:** mean of the differences d_bar, SD of the differences s_d, number of pairs n, tail, alpha.

**Outputs:** the t-statistic, df, the p-value, and the significance flag.

## 3. Worked example

`d_bar = 2.5, s_d = 3.0, n = 20`:

```
t  = 2.5 / (3.0 / sqrt(20)) = 2.5 / 0.6708 = 3.727
df = 19
p  = 2 (1 - tcdf(3.727, 19)) = 0.00143   (two-sided; matches scipy stats.t)
```

The one-sided p is exactly half (0.00071); a zero mean difference gives t = 0 and p = 1.

## 4. Scope and non-goals

Enter the summary of the differences you already computed (this tile does not ingest the raw paired columns). Pairing
removes between-subject variation, so a paired test is usually more powerful than a two-sample test on the same data,
but it requires genuinely matched pairs. Small n (< 30) leans on the normality of the differences.
