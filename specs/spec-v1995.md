# roughlogic.com Specification v1995 -- Lawn Fertilizer Product Rate (`calc-farmproduction.js`, Group L, landscaping, 1 New Tile)

> **Status: LANDED 2026-11-16 (proposed 2026-11-16). Single-tile spec.** In scope under the spec-v106 trades-only
> charter: Group L, beside `npk-blend` (field crops by the acre from a soil test) and `sod-takeoff`, no new dependency
> and no network call.
>
> **The gap.** "How much fertilizer for 5,000 sq ft of lawn" is the commonest landscaping fertilizer question, and the
> catalog's only fertilizer tile works in pounds per acre for field crops from a soil-test credit. A turf crew works
> from the bag's three-number analysis and a nitrogen rate per 1,000 sq ft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The tile: `lawn-fertilizer-rate`

```
product rate   lb product per 1,000 sq ft = lb N per 1,000 sq ft / (N% / 100)
P and K        lb P2O5 (or K2O) per 1,000 sq ft = product rate x P% (or K%) / 100
whole lawn     lb product = product rate x area / 1,000; per acre = rate x 43.56
bags           bags = lb product / bag weight (exact, and rounded up to buy);
               one bag covers bag weight / product rate x 1,000 sq ft
```

**Inputs:** lawn area (sq ft), nitrogen rate (lb N per 1,000 sq ft, 1 default), the analysis N-P-K percentages,
bag weight (lb, 50 default). Refused: a non-positive area or N, N above 2 lb per 1,000 sq ft (extension guidance is 1
or less per application; above 1 is flagged), N% above 46 (urea), an analysis over 100%, a bag over 100 lb.

## 2. Worked examples (publisher)

Penn State Extension (Landschoot), 26-5-10 in a 50 lb bag at 1.0 lb N per 1,000 sq ft: 1.0 / 0.26 = 3.8 lb product
per 1,000 sq ft; 0.19 lb P2O5 and 0.38 lb K2O; a bag covers about 13,000 sq ft (Penn State prints 13,200 from the
rounded 3.8); 30,000 sq ft takes about 2.3 bags. The tile: 3.846, 0.192, 0.385, 13,000 sq ft, 2.31 bags (buy 3).

UF/IFAS GI-BMP worksheet: 16-0-8 at 1 lb N per 1,000 sq ft on 5,000 sq ft is 31.25 lb.

## 3. Scope

Granular product by weight. It does not set a spreader (the label does), split slow- and quick-release nitrogen,
convert liquid products by volume, or read a soil test (`npk-blend`). Local phosphorus and blackout-season rules and
the product label govern.
