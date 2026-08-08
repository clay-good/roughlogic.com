# roughlogic.com Specification v1236 -- One-Sample t-Test (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module, group, or dependency. Inherits spec.md through spec-v1235.md.
>
> **The gap.** Family-completion: the t-test family has `two-sample-t-test` and `paired-t-test` but not the one-sample
> test (a sample mean against a fixed target/spec value).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, n < 2, a negative SD, or a sample with no spread return `{ error }`. Citation discipline (v19/v22):
OpenIntro Statistics Chapter 7 (inference for a single mean), `GOVERNANCE.general`. The Student-t CDF reuses the
module's bundled `tcdf` helper. **No table is reproduced.**

## 2. The tile

### 2.1 `one-sample-t-test` -- One-Sample t-Test (Mean vs Target)

```
t = (x_bar - mu0) / (s / sqrt(n))        df = n - 1
p = 2 (1 - tcdf(|t|, df))  (two-sided)  or  1 - tcdf(|t|, df)  (one-sided)
```

**Inputs:** sample mean x_bar, sample SD s, sample size n, hypothesized/target mean mu0, tail, alpha.

**Outputs:** the t-statistic, df, the p-value, and the significance flag.

## 3. Worked example

`x_bar = 16.1, s = 0.3, n = 25, mu0 = 16.0`:

```
t  = (16.1 - 16.0) / (0.3 / sqrt(25)) = 0.1 / 0.06 = 1.667
df = 24
p  = 2 (1 - tcdf(1.667, 24)) = 0.1086   (two-sided; matches scipy stats.t)
```

Not significant at 0.05. The same effect in a sample of 400 (t = 6.67) is highly significant -- n sharpens the test.

## 4. Scope and non-goals

mu0 is a fixed target/spec value, not a second sample (that is `two-sample-t-test`) and not a mean difference of pairs
(that is `paired-t-test`). Small n (< 30) leans on approximate normality of the sample.
