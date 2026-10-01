# roughlogic.com Specification v1879 -- Emergency Drinking Water Bleach Dose (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** The EPA's emergency bleach table is the most-printed water number in any disaster, and it is internally inconsistent: one parenthetical in it delivers half again the dose of the drop count beside it. No tile turns a container volume and a bottle strength into drops, teaspoons, and the concentration they actually produce.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive water volume, bleach strength, or drop volume returns `{ error }`; a strength above 15% returns `{ error }` (no household or commercial liquid bleach is stronger); no numeric field is ever `Infinity`. Citation discipline
(v19/v22): EPA "Emergency Disinfection of Drinking Water" and CDC "How to Make Water Safe in an Emergency" named as the method, the local health department and the water utility's boil-water or do-not-drink notice named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`emergency water bleach`, `how much bleach per gallon of water`, `disinfect drinking water bleach drops`, `bleach water purification ratio`, `water barrel bleach`.

**Relationship to existing tiles, disclosed.** `kitchen-sanitizer-ppm` (frozen Group O) and `pool-chlorine-dose` compute the same ratio -- product volume per water volume for a target concentration. This tile is kept because the drinking-water method is a different procedure: it starts from the EPA drop table rather than a target ppm, applies the cloudy/cold doubling rule, and carries the settle-filter-wait-smell sequence. The scope document records the overlap.

## 2. The tile

### 2.1 `emergency-water-bleach-dose` -- Emergency Drinking Water Bleach Dose

```
EPA table        8 drops per gallon of 6% bleach, 6 drops per gallon of 8.25%
                 (2 drops per quart for either); scale linearly with volume
double           2 x the dose when the water is cloudy, colored, or very cold,
                 AFTER settling and filtering through cloth or a coffee filter
drop volume      the table's own rows imply 1 drop = 1/96 tsp = 0.0513 mL
                 (16 drops = 1/6 tsp); a pharmacy drop is 0.05 mL
teaspoons        drops / 96        mL = drops x 0.0513
dose, mg/L       mL of bleach x strength% x 10 / litres of water
                 (strength read as g per 100 mL; about 6.5 mg/L at the base rate)
wait             stir, stand 30 min; a slight chlorine odour means done; no odour
                 means dose again and stand 15 min more
```

The EPA table is a scaled constant, and its per-gallon rate is the whole of it: 8 drops of 6% bleach or 6 drops of
8.25% bleach per gallon, which both land near 6.5 mg/L. The tile scales that rate to any container -- a 5 gallon
bucket, a 55 gallon drum, a 275 gallon tote -- and converts the drops to teaspoons and millilitres, because nobody
counts 440 drops. The doubling rule is applied after the physical step, not instead of it: cloudy water is settled and
filtered first, and the doubled dose covers the chlorine demand that filtering does not remove.

The table is not self-consistent, and the tile reports the inconsistency rather than hiding it. Every row except one
implies a drop of 1/96 teaspoon: 2 gallons of 8.25% is "12 drops (1/8 tsp)", 4 gallons of 6% is 1/3 tsp for the
32 drops the rate predicts. The exception is 2 gallons of 6%, printed as "16 drops (1/4 tsp)": at 1/96 tsp per
drop, 16 drops is 1/6 tsp. A reader who measures the parenthetical instead of counting drops doses 1.5 times the
table's rate -- about 9.8 mg/L, which is exactly Ready.gov's "1/8 teaspoon per gallon". The quart row has a smaller
anomaly of its own: 2 drops per quart of 8.25% is 8 per gallon rather than 6, because a drop cannot be split.

The concentration shown is a dose, not a residual, and the tile says so. Chlorine demand from organics, iron, and
cold-water kinetics consumes part of the dose; the 30-minute smell test is the field check that some free chlorine
remains, and it is the check the procedure depends on. A dose computed here is not a substitute for a boil-water
notice lifting, and water known to be contaminated with fuel, chemicals, or toxic substances is not made safe by
bleach at any dose.

**Inputs:** the water volume and its unit, the bleach strength (6% or 8.25% or entered), whether the water is cloudy, colored, or very cold, and optionally the drop volume

**Outputs:** the drops, teaspoons, and millilitres of bleach at the base and doubled rates, the resulting dose in mg/L, the wait and retest times, and the table-consistency note

## 3. Worked example

A 55 gallon drum of well water after a flood, cloudy after settling, with an 8.25% bottle:

```
base      6 drops/gal x 55 gal = 330 drops = 3.44 tsp = 16.9 mL
dose      16.9 mL x 8.25 x 10 / (55 x 3.785 L) = 6.7 mg/L
cloudy    x 2 = 660 drops = 6.88 tsp = 33.9 mL -> 13.4 mg/L
```

**About 7 teaspoons of 8.25% bleach for the cloudy drum** -- a number a person can actually measure, where 660 drops
is not. Stand 30 minutes and check for a slight chlorine odour; without one, dose again and wait 15 minutes more.

**The same drum with a 6% bottle takes 440 drops, 4.58 tsp, at the base rate -- and 9.17 tsp doubled.**

**Where the table disagrees with itself:**

```
6%, 2 gal, counted     16 drops at 1/96 tsp = 0.82 mL -> 6.5 mg/L
6%, 2 gal, measured    "1/4 tsp" = 1.23 mL          -> 9.8 mg/L
```

**Measuring the printed teaspoon gives 1.5 times the counted dose** -- the same 9.8 mg/L that Ready.gov's 1/8 tsp
per gallon produces. Both are within the range the procedure tolerates, and the smell test governs either way;
**the point is that two official rates differ by half, and a reader deserves to know which one they used.**

## 4. Scope and non-goals

An emergency household and field disinfection aid for clear-to-cloudy fresh water using unscented liquid bleach. It does not treat water contaminated with fuel, solvents, pesticides, heavy metals, or other chemicals, which chlorine does not remove; it does not address Cryptosporidium, which chlorine does not reliably inactivate at these doses and which boiling or appropriate filtration does; and it does not replace boiling where a boil-water notice is in force. Bleach strength degrades in storage and heat, so an old bottle delivers less than its label, and scented, splash-less, or color-safe products are excluded by the EPA method. The mg/L is a dose from a nominal strength read as grams per 100 mL, accurate to roughly 10%; it is not a measured residual, and a free-chlorine test kit reading supersedes it. It does not size bulk system disinfection (`main-disinfection-chlorine`, `well-shock-chlorination`) or compute chlorine demand from a test (`chlorine-demand`). The EPA and CDC emergency disinfection guidance, the local health department, and the utility's public notice govern.
