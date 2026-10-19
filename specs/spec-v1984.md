# roughlogic.com Specification v1984 -- Chimney Termination Height (IRC R1003.9, the 3-2-10 Rule) (`calc-masonry.js`, Group E Carpentry and Construction, masonry, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the masonry chimney bench in `calc-masonry.js` beside `fireplace-flue-area`,
> with `chimney-draft` and `chimney-height-for-draft` in `calc-hvac.js` as the draft-side siblings, no new dependency
> and no network call.
>
> **The gap.** `chimney-height-for-draft` gives the height the draft needs and says nothing about the height the code
> needs. R1003.9's rule -- 3 ft above the roof where the chimney passes through it, and 2 ft above anything within 10
> ft -- is geometry on a sloped roof that every mason and sweep works out on the ridge with a tape: the roof rises
> toward the ridge, so the "anything within 10 ft" is usually the roof itself, upslope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a negative pitch,
distance or height, a chimney width of zero, or a pitch over 24 in 12 returns `{ error }`. Citation: IRC 2024 R1003.9
by name (matching IBC 2113.9), values unchanged since the 2015 edition, free at codes.iccsafe.org; NFPA 211 named for
the same rule and for factory-built chimneys, GOVERNANCE.general. Aliases: `3 2 10 rule chimney`, `how tall does a
chimney have to be above the roof`, `chimney height 2 feet above within 10 feet`, `R1003.9 chimney termination`,
`chimney too short for the ridge`.

## 2. The tile

### 2.1 `chimney-termination-height` -- Chimney Termination Height (IRC R1003.9, the 3-2-10 Rule)

```
rule 1          the chimney extends at least 3 ft above the highest point where it passes
                through the roof
rule 2          and at least 2 ft higher than any portion of the building within 10 ft,
                measured horizontally
roof within     on a roof of pitch p (in per 12) the surface d ft upslope of the
10 ft           penetration is higher by p x d / 12; the highest roof within 10 ft is at
                d = min(10, distance to the ridge), so rule 2 needs 2 + p x min(10, D_ridge) / 12
other portion   a dormer, parapet, taller wall or adjacent roof within 10 ft, entered as
                its height above the penetration point: rule 2 needs 2 + that
required        H = max(3, 2 + roof rise within 10 ft, 2 + other portion height), above
                the HIGH side of the penetration
low-side height the chimney width adds p x w / 12 across itself; the height above the
                low (downslope) side is H + p x w / 12, which is what a tape from the
                eave side measures
```

The two rules are one rule read on a slope. On a flat roof 3 ft governs. On a pitched roof the roof itself is "a
portion of the building within 10 ft", and it rises upslope of the chimney at the pitch, so a chimney 14 ft below a
6-in-12 ridge faces a roof 5 ft higher ten feet away and must top it by 2 ft: 7 ft, not 3. A chimney at the ridge
faces nothing higher and 3 ft governs. A steep roof makes the number large quickly: 12 in 12 with the ridge 6 ft
away gives 8 ft above the high side of the penetration.

The tile also reports the height above the low side, because the chimney's own width crosses a sloped roof and a
tape held on the downslope face reads higher than the rule. On a 32 in wide chimney at 6 in 12 that is 16 in.

**Inputs:** the roof pitch (rise per 12), the horizontal distance from the chimney to the ridge or to the end of the
roof slope, the height above the penetration of any other building portion within 10 ft (0 if none), the chimney's
width along the slope, and the chimney's measured height above the high side of the penetration

**Outputs:** the roof rise within 10 ft, the required height by each rule and the governing one, the required height
above the low side, and pass/fail against the measured height

## 3. Worked example

A 6 in 12 roof, chimney 14 ft horizontally below the ridge, nothing else within 10 ft, chimney 32 in wide along the
slope, built 6 ft above the high side of the penetration:

```
rise within 10 ft = 6 x min(10, 14) / 12 = 5.00 ft
rule 1            = 3.00 ft
rule 2 (roof)     = 2 + 5.00 = 7.00 ft   governs
required          = 7.00 ft above the high side
low-side height   = 7.00 + 6 x (32 / 12) / 12 = 8.33 ft
measured 6 ft < 7 ft:  FAIL, 1 ft short
```

**Three feet would have been right only at the ridge.** At 12 in 12 with the ridge 6 ft away the rise is 6 ft and 8 ft
is required; at 4 in 12 with the ridge 30 ft away the rise within 10 ft is 3.33 ft and 5.33 ft is required.

## 4. Scope and non-goals

A geometry check against the code's rule, not a draft design (`chimney-draft` and `chimney-height-for-draft`), a flue
sizing (`fireplace-flue-area`), or a wind study. It does not address factory-built chimneys' listed terminations,
spark arrestors (R1003.9.2), chimney caps, crickets (R1003.20), or a chimney serving an appliance whose manufacturer
lists a different termination. The adopted edition and the AHJ govern; free at codes.iccsafe.org.
