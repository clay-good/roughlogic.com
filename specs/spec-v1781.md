# roughlogic.com Specification v1781 -- Yeast Pitch Rate and Cell Count (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Pitching is a cell count, not a volume, and the count scales with both the batch size and the wort's strength. The slurry that delivers it depends on a viability figure that falls every time the yeast is repitched, so the same bucket delivers fewer cells each generation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, gravity, pitch rate, or slurry concentration, a viability outside 0 to 1, or a specific gravity at or below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cells-per-millilitre-per-degree-Plato pitch convention and the Plato-from-gravity relation with the yeast supplier's data and a measured cell count named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`yeast pitch rate`, `cell count brewing pitch`, `slurry viability repitch`, `lager pitch rate plato`, `yeast cells per ml per plato`.

## 2. The tile

### 2.1 `yeast-pitch-rate` -- Yeast Pitch Rate and Cell Count

```
pitch rate       million cells per mL per degree Plato; about 0.75 for ales and
                 about 1.5 for lagers, with high-gravity worts pitched higher still
cells required   rate x 10^6 x volume in mL x degrees Plato
degrees Plato    P is roughly 259 - 259 / SG for brewing worts
slurry           mL of slurry = cells required / (cells per mL x viability)
viability        the fraction of cells that are alive, from a stain count; it falls
                 with each generation and with storage time and temperature
                 (`hemocytometer` is the counting method)
underpitching    a long lag, stressed yeast, high esters and fusels, and a stuck or
                 slow fermentation
overpitching     a thin, characterless beer and rapid yeast autolysis
```

The pitch rate has two multipliers and both of them matter. Volume is obvious. Gravity is less so: a stronger
wort presents more sugar per cell and a higher osmotic stress, so it needs proportionally more yeast, which is
why the rate is written per degree Plato rather than per barrel. Scaling a pitch by volume alone and then
brewing a strong beer underpitches it by exactly the gravity ratio.

Lagers take roughly twice the ales' rate and the reason is temperature. Cold fermentation slows every rate the
yeast depends on, so the population has to be large enough at the start to do the work without the growth
phase an ale relies on. A lager pitched at an ale rate ferments slowly, throws sulfur and diacetyl, and takes
a long conditioning to recover, if it recovers.

Viability is the term that turns a calculation into a measurement. A fresh, healthy slurry and a tired one
look the same in the bucket and differ by a factor that decides whether the pitch is correct, and the only way
to know is to count and stain. A brewery repitching yeast without a viability check is pitching a declining
number every generation and discovering it when a fermentation stalls.

**Inputs:** the batch volume, the original gravity or degrees Plato, the pitch rate for the yeast type, the slurry concentration in cells per millilitre, and the viability fraction

**Outputs:** the degrees Plato, the cells required for an ale and for a lager pitch, the slurry volume needed at the entered concentration and viability, and the slurry volume required at a lower viability

## 3. Worked example

A 310 gal batch at 1.055:

```
volume = 310 gal = 1,173,478 mL
Plato  = 259 - 259 / 1.055 = 13.50 degP
ale    = 0.75 x 10^6 x 1,173,478 x 13.50 = 1.188e+13 cells
lager  = 1.50 x 10^6 x 1,173,478 x 13.50 = 2.377e+13 cells
```

**About 11.9 trillion cells for the ale and 23.8 trillion for the lager.** The counts are large enough
that they only become tractable as a slurry volume:

```
slurry = 1.188e+13 / (1.2e+09 x 0.90) = 11,003 mL = 11.0 L = 2.9 gal
```

**2.9 gallons of healthy slurry pitches this batch.** That is the number the cellar actually works with,
and it depends entirely on the two figures behind it.

**Drop the viability and watch the bucket grow:**

```
at 60% viability: slurry = 1.188e+13 / (1.2e+09 x 0.60) = 16.5 L = 4.4 gal
```

**4.4 gallons instead of 2.9 -- 50 percent more slurry for exactly the same pitch.** The yeast looks
identical in the bucket. A cellar pitching by volume from a mark on the side is **underpitching by
33 percent** the moment viability slips from 90% to 60%, and the first evidence is a fermentation that
lags.

**And the gravity multiplier compounds it.** Brew this recipe at 1.080 instead, at 19.2 degP, and the
required count rises to 16.9 trillion -- **42% more yeast for the same volume of beer.** A strong beer
pitched at a standard beer's slurry volume is underpitched twice over, once on gravity and once on whatever
viability has done since the last brew.

## 4. Scope and non-goals

A pitch sizing calculation. It does not count cells or measure viability, and both are measurements rather than assumptions -- a haemocytometer with a viability stain (`hemocytometer`) or an automated counter is what establishes them, and a slurry's concentration varies with how it was cropped, how long it settled, and how much trub and beer came with it. Pitch rates are a starting band from brewing practice and vary with the strain, the wort composition, the oxygenation, the fermentation temperature, and the brewery's own results; a strain's supplier and the brewery's records govern. It does not address yeast health beyond viability -- vitality, glycogen and sterol reserves, and generation number all affect performance and none appear in a count -- nor does it address wort oxygenation, nutrient additions, propagation, acid washing, or the generation limit beyond which a culture should be replaced. It does not predict attenuation, fermentation time, or flavour. The yeast supplier's data, a measured cell count and viability, and the brewery's own fermentation records govern.
