# roughlogic.com Specification v1779 -- Hop Bitterness IBU (Tinseth) (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Bitterness is the alpha acids that isomerise in the boil, and the fraction that does depends on how long the hops boil and how strong the wort is. Both dependencies are non-linear, and the wort gravity one is the reason the same hop schedule bitters a strong beer far less than a weak one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, hop weight, or boil time, an alpha acid fraction outside 0 to 1, or a boil gravity below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Tinseth utilisation relation and its bigness and boil-time factors with the hop supplier's lot analysis and a laboratory bitterness measurement named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ibu tinseth calculation`, `hop bitterness utilization`, `alpha acid isomerization`, `hop schedule ibu`, `boil gravity hop utilization`.

## 2. The tile

### 2.1 `ibu-tinseth` -- Hop Bitterness IBU (Tinseth)

```
alpha acids      mg/L = grams of hops x alpha acid fraction x 1000 / litres
utilisation      the fraction that isomerises: U = bigness x boil time factor
bigness          1.65 x 0.000125^(G_boil - 1), where G_boil is the specific gravity
                 of the wort DURING the boil, not the original gravity
time factor      (1 - e^(-0.04 t)) / 4.15, with t in minutes
IBU              mg/L of alpha acids x utilisation
the time curve   utilisation rises steeply to about 30 minutes and flattens after
                 60; the last half hour of a 90 minute boil adds very little
the gravity term a stronger wort extracts less bitterness from the same hops, which
                 is why high-gravity beers need disproportionate hop loads
whirlpool        additions below boiling isomerise far less and are not covered by
                 this relation
```

The model is an empirical fit to brewhouse practice and it should be used as one. Tinseth's relation was
derived from measured bitterness in real beers rather than from isomerisation chemistry, so it captures the
combined effect of the boil, the break, the trub, the fermentation, and the losses that follow, and it does
that better than a first-principles calculation would. It also means the numbers it returns are specific to
the practice it was fitted to, and a brewhouse with an unusual whirlpool or a long hop stand will not match
it.

The time curve's shape is the most useful thing in the relation. Utilisation climbs quickly, then flattens, so
the bittering value of a hop addition is nearly exhausted by an hour -- and boiling longer to extract more
bitterness is a poor trade against the energy, the evaporation, and the colour a long boil develops. Late
additions contribute aroma and very little bitterness, which is exactly why hop schedules are built the way
they are.

The gravity term is the one that catches brewers scaling a recipe up in strength. Alpha acid isomerisation is
suppressed in dense wort, so the identical hop addition in a barleywine delivers substantially less bitterness
than in a session beer, and a recipe scaled by gravity alone comes out unbalanced and cloying. The correction
is not small and it works against the brewer at exactly the moment more bitterness is wanted.

**Inputs:** the batch volume, each hop addition's weight, alpha acid percentage, and boil time, and the specific gravity of the wort during the boil

**Outputs:** the alpha acids in milligrams per litre, the bigness factor, the boil time factor, the utilisation, the IBU contribution of each addition and the total, and the same addition's IBU at an alternative boil time or boil gravity

## 3. Worked example

A 310 gal batch with 5 lb of 12% alpha hops boiled 60 minutes in wort at 1.050:

```
volume       = 310 gal = 1,173 L
alpha acids  = 2,268 g x 0.12 x 1000 / 1,173 = 231.9 mg/L
bigness      = 1.65 x 0.000125^(1.050 - 1) = 1.0528
time factor  = (1 - e^(-0.04 x 60)) / 4.15 = 0.2191
utilisation  = 1.0528 x 0.2191 = 0.2307
IBU          = 231.9 x 0.2307 = 53.5
```

**53 IBU, and only 23.1% of the alpha acids ever became bitterness.** The rest went out with the trub, which
is why hop bills look extravagant beside the bitterness they buy.

**Cut the boil to 15 minutes and watch the curve's shape:**

```
time factor = 0.1087   utilisation = 0.1145   IBU = 26.5
```

**A quarter of the boil time gives 50% of the bitterness, not 25%.** Utilisation rises fastest early, so the
first fifteen minutes are worth far more per minute than the last forty-five -- and the corollary is that
extending a boil to chase bitterness is nearly worthless.

**Now the term that ruins scaled-up recipes.** The same 5 lb, the same 60 minutes, in wort at 1.080:

```
bigness     = 1.65 x 0.000125^(1.080 - 1) = 0.8040
utilisation = 0.1762
IBU         = 40.9
```

**41 IBU against 53 -- a 24 percent loss from wort gravity alone**, with the hops, the time, and the
volume all unchanged. To hold 53 IBU in the stronger wort the charge would have to rise to
6.5 lb. **A strong beer does not merely tolerate a bigger hop bill; it requires one to taste the
same.**

## 4. Scope and non-goals

An empirical bitterness estimate. Tinseth's relation is a fit to measured bitterness in beers made a particular way, not a chemical model, and real IBU varies with hop variety and form, pellet versus whole cone, the age and storage of the hops, boil vigour, kettle geometry, trub and yeast adsorption, fermentation, filtration, and packaging -- a laboratory measurement is the only thing that establishes a beer's actual bitterness. The alpha acid percentage must come from the lot's own analysis, since it varies substantially between crops and degrades in storage. The relation does not cover whirlpool and hop-stand additions below boiling, first-wort hopping, dry hopping (`dry-hop-beer-loss`, which contributes aroma and essentially no bitterness), hop extracts, or isomerised products, all of which follow different rules. Measured IBU and perceived bitterness are not the same thing and diverge with malt sweetness, water sulfate, and carbonation. The hop supplier's lot analysis, a laboratory bitterness measurement, and the brewer govern.
