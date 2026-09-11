# roughlogic.com Specification v1782 -- Kettle Boil-Off Rate and Post-Boil Gravity (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** The boil concentrates the wort, so the evaporation rate sets the original gravity as directly as the grain bill does. A kettle boiling harder than the recipe assumed delivers a stronger beer and less of it, and both errors arrive together.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pre-boil volume, gravity, or boil duration, a boil-off rate or shrinkage outside 0 to 1, or an evaporated volume at or above the pre-boil volume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the extract conservation relation across the boil and the wort shrinkage convention with the brewery's own measured kettle boil-off rate named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`kettle boil off rate`, `post boil gravity`, `evaporation rate brewing`, `wort shrinkage cooling`, `pre boil to og`.

## 2. The tile

### 2.1 `kettle-boil-off` -- Kettle Boil-Off Rate and Post-Boil Gravity

```
evaporation      volume lost = pre-boil volume x boil-off rate x hours; a typical
                 kettle runs 6 to 10% per hour, and it is a property of the kettle
                 and the vigour, not of the recipe
post-boil hot    pre-boil volume - evaporation, measured at boiling
shrinkage        wort contracts about 4% cooling from boiling to room temperature;
                 the cold volume is the one that fills the fermenter
gravity          extract is conserved, so gravity points x volume is constant:
                 OG = pre-boil points x pre-boil volume / post-boil volume
the coupling     the boil-off rate sets the OG and the volume at the same time, and
                 in opposite directions
hop bitterness   boil gravity is the average across the boil, and it rises as the
                 boil proceeds (`ibu-tinseth`)
```

Extract is conserved across the boil and volume is not, and everything here follows from that. Nothing leaves
the kettle but water vapour and a little dimethyl sulfide, so the gravity points in the wort at the start are
the gravity points at the end, redistributed into a smaller volume. That makes original gravity a division
problem rather than a chemistry one, and it makes the evaporation rate a direct lever on the beer's strength.

The two errors that a wrong boil-off rate produces point in opposite directions and so partly disguise each
other. A kettle evaporating harder than expected gives a stronger beer, which looks like good efficiency, and
less of it, which looks like a volume loss somewhere else. A brewer chasing the volume shortfall by adding
water at knockout gets the volume back and gives the gravity away, and the two mistakes cancel into a
consistent puzzle rather than a diagnosis.

Shrinkage is small, real, and easy to double-count. Wort measured hot in the kettle and wort measured cold in
the fermenter are different volumes of the same beer, so a brewery that records one and expects the other is
consistently out by about four percent. It matters most where the two measurements meet: a kettle volume sight
glass and a fermenter volume mark do not agree and are not supposed to.

**Inputs:** the pre-boil volume and gravity, the boil-off rate per hour, the boil duration, and the cooling shrinkage fraction

**Outputs:** the volume evaporated, the hot post-boil volume, the cooled volume into the fermenter, the post-boil gravity hot and cold, the total extract in point-gallons as a conservation check, and the same figures at an alternative boil-off rate

## 3. Worked example

350 gal of 1.049 wort, boiled 1 hour at 8% per hour:

```
extract    = 49 x 350 = 17,150 point-gallons (constant through the boil)
evaporated = 350 x 0.08 = 28.0 gal
hot volume = 350 - 28.0 = 322.0 gal   ->  53.3 points (1.053)
cooled     = 322.0 x (1 - 0.04) = 309.1 gal   ->  55.5 points (1.055)
```

**1.055 into the fermenter, from a 1.049 pre-boil.** The boil added 6.5 gravity points and removed
40.9 gallons, and the extract never changed -- 17,150 point-gallons at every step, which is the check that
catches an arithmetic error anywhere in the brew day.

**Shrinkage is worth 12.9 gallons and 2.2 gravity points.** A brewery reading its kettle hot and its
fermenter cold is comparing two different volumes of the same wort, and the 4% between them is not a loss to
hunt for.

**Now let the kettle boil harder than the recipe assumed:**

```
at 12%/h: evaporated = 42.0 gal, hot = 308.0, cooled = 295.7 gal
             OG = 58.0 points (1.058)
```

**1.058 instead of 1.055, and 13.4 gallons short.** A single change to the burner produced a beer
2.5 points stronger and 4 percent smaller -- **more alcohol, fewer barrels, and a different beer than
the one on the brand sheet.**

**And the two errors hide each other.** The high gravity reads as good brewhouse efficiency
(`brewhouse-efficiency`) while the short volume reads as a loss in the transfer. **Topping up to volume at
knockout gives back 13.4 gallons and gives away the gravity**, which lands the brewer back on target by
cancelling two mistakes rather than by fixing either. Measure the boil-off rate on the kettle and the puzzle
disappears.

## 4. Scope and non-goals

A volume and gravity balance. The boil-off rate is entered and is a property of the particular kettle -- its surface area, geometry, vigour, lid position, stack draft, and the ambient conditions -- so it must be measured on the vessel in use and rechecked when anything about the boil changes; a rate borrowed from another brewhouse is a guess. Shrinkage is a convention near four percent and varies slightly with gravity and with the measurement temperatures. It does not address what the boil is for: protein coagulation and the hot break, hop isomerisation (`ibu-tinseth`), dimethyl sulfide driven off by vigour rather than duration, colour development and kettle caramelisation (`beer-color-srm`), and pH change all depend on boil time and intensity, and none of them are volume arithmetic. It does not account for trub and whirlpool losses after the boil, which reduce the volume reaching the fermenter again, or for the energy the evaporation costs. The brewery's own measured kettle boil-off rate and the brewer govern.
