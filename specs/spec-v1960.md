# roughlogic.com Specification v1960 -- Kick Tolerance at the Casing Shoe (`calc-oilgas.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> oil and gas bench in `calc-oilgas.js`, no new dependency and no network call.
>
> **The gap.** `kill-mud-weight` circulates a kick out and said it "does not compute kick tolerance or the
> equivalent mud weight at the shoe"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a mud weight outside
(0, 25] ppg, a leak-off equivalent not above the mud weight, a well depth not below the shoe, a kick intensity
outside 0 to 10 ppg, an influx gradient not lighter than the mud, a missing annular capacity, a negative safety
margin, or a safety margin that consumes the whole casing-pressure margin returns `{ error }`. A kick intensity
the shoe cannot take even with no influx is an answer, not an error. Citation: the single-bubble method as
well-control manuals state it, by name, GOVERNANCE.general. Aliases: `kick tolerance`,
`kick tolerance calculation`, `maasp`, `maximum allowable annular surface pressure`,
`maximum allowable shut in casing pressure`, `how big a kick can the shoe take`.

## 2. The tile

### 2.1 `kick-tolerance`

Gm = 0.052 x mud weight; Gi = influx gradient; open hole = well TVD - shoe TVD.

| Quantity | Relation |
|---|---|
| Shoe limit, psi | 0.052 x leak-off equivalent x shoe TVD - safety margin |
| Maximum allowable casing pressure | shoe limit - Gm x shoe TVD |
| Formation pressure | 0.052 x (mud weight + kick intensity) x well TVD |
| Tallest influx H, ft | (shoe limit - Pf + Gm x open hole) / (Gm - Gi), from 0 to the open hole |
| Volume at the shoe, as shut in | H x drill pipe annulus x shoe limit / Pf |
| Volume at bottom | H x bottom-hole assembly annulus |
| Kick tolerance | the smaller of the two |
| Largest kick with no influx, ppg | maximum allowable casing pressure / (0.052 x well TVD) |

## 3. Worked examples (registry rows)

- 10 ppg under a 14 ppg shoe at 3,000 ft, well at 5,000 ft, 0.5 ppg kick, gas at 0.1 psi/ft: 624 psi, 1,176 ft,
  43.2 bbl at the shoe as shut in, 34.3 bbl at bottom, which governs.
- The same well at 2 ppg with weightless gas: 200 ft, and the casing pressure with that gas at bottom is 624 psi.
