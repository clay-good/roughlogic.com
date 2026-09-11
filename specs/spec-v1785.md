# roughlogic.com Specification v1785 -- Distillation Charge, Cut, and Proof Gallon Yield (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A distillery is taxed on proof gallons, and a proof gallon is not a gallon of spirit -- it is a gallon at 100 proof. The consequence is an identity worth knowing: proof gallons are exactly twice the absolute alcohol, whatever proof the spirit is cut to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wash volume or excise rate, an alcohol by volume or recovery outside 0 to 1, a non-positive proof, or cut shares that do not sum to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the proof gallon definition at 60 degF and the absolute-alcohol identity with the TTB regulations and gauging manual named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`proof gallon calculation`, `distillery excise tax proof gallons`, `absolute alcohol yield still`, `heads hearts tails cut`, `wine gallon to proof gallon`.

## 2. The tile

### 2.1 `proof-gallon-yield` -- Distillation Charge, Cut, and Proof Gallon Yield

```
wine gallon      a US gallon of spirit at whatever strength it happens to be
proof            twice the alcohol by volume percentage at 60 degF
proof gallon     PG = wine gallons x proof / 100
the identity     since proof = 2 x ABV, PG = wine gallons x 2 x ABV = 2 x the
                 ABSOLUTE ALCOHOL volume -- cutting with water does not change it
charge           absolute alcohol in = wash gallons x wash ABV
recovery         the fraction of that alcohol reaching the collected spirit;
                 the balance is in the spent wash, the heads, and the tails
cuts             heads, hearts, and tails split the recovered alcohol; only the
                 hearts are the product, and the tails are usually redistilled
excise           federal tax is per proof gallon at a reduced rate on the first
                 tranche of annual production
```

The proof gallon identity is the single most useful fact in a distillery's tax arithmetic and it surprises
people every time. Because proof is defined as twice the alcohol by volume, the proof gallon measure collapses
to twice the absolute alcohol in the container, and the strength cancels out. A barrel entered at high proof
and a bottle cut to eighty proof from it carry the same proof gallons, so watering down a spirit reduces
nothing that is taxed. Tax is on the alcohol, and it was always on the alcohol.

Recovery and cuts are two different losses and they must be tracked separately. Recovery is what the still
failed to collect at all -- alcohol left in the spent wash, lost to the column, or vented -- and it is a
process efficiency. The cuts are a deliberate quality decision made on alcohol that was successfully
collected, and the heads and tails are not lost so much as redirected, usually back into the next charge.
Conflating them hides whichever one is actually costing the distillery.

The temperature qualification in the definition is not decorative. Proof is defined at 60 degrees Fahrenheit,
and both alcohol and water change volume substantially with temperature, so a hydrometer reading taken warm
and reported as proof is wrong in a direction that matters to a tax return. Gauging is done with a temperature
correction, and the correction tables are part of the regulation rather than a refinement.

**Inputs:** the wash volume and alcohol by volume, the still's alcohol recovery, the collection proof, the heads, hearts, and tails shares, and the excise rate

**Outputs:** the absolute alcohol charged, the alcohol recovered, the wine gallons and proof gallons at the collection proof, the proof gallons after cutting to a second proof, the hearts fraction in proof gallons, and the excise tax on each

## 3. Worked example

A 500 gal charge of wash at 8% alcohol by volume, with an 85% recovery:

```
absolute alcohol in = 500 x 0.08 = 40.0 gal
recovered           = 40.0 x 0.85 = 34.0 gal absolute
collected at 140 proof:
  wine gallons = 34.0 / 0.70 = 48.57 gal
  proof gallons = 48.57 x 140 / 100 = 68.00 PG
```

**Now cut the same spirit to 80 proof and recompute:**

```
  wine gallons = 34.0 / 0.40 = 85.00 gal
  proof gallons = 85.00 x 80 / 100 = 68.00 PG
```

**68.0 proof gallons either way, from 49 gallons of spirit or 85.** The volume nearly doubled and the
taxable quantity did not move at all, **because 68.0 is simply 34.0 gallons of alcohol times two.** That
identity is the check that catches an arithmetic error anywhere in a gauging record: **proof gallons should
always equal twice the absolute alcohol, and if they do not, the proof or the volume is wrong.**

**The tax follows the alcohol, not the bottle:**

```
excise = 68.00 PG x $2.70 = $183.60
```

**And the cuts decide how much of it is product.** Taking 75% of the recovered alcohol as hearts:

```
hearts = 34.0 x 0.75 = 25.50 gal absolute = 51.00 PG
tax on hearts = $137.70
```

**51.0 proof gallons of saleable spirit from a 500 gallon charge**, and the 17.0 PG in the heads and tails
are not waste -- they go back into the next charge, where they are recovered again. **The recovery loss and the
cut are different numbers with different remedies**, and a distillery that reports one combined yield figure
cannot tell a still problem from a cut decision.

## 4. Scope and non-goals

A yield and gauging aid, not a tax filing. Federal excise rates, the reduced-rate tranches, and the conditions and controlled-group rules attached to them are set by statute and change; the rate entered here is a figure the user supplies and the current Alcohol and Tobacco Tax and Trade Bureau schedule governs. Gauging for tax purposes is a regulated procedure with prescribed instruments, temperature corrections to 60 degF, and the TTB gauging manual's tables, and a hydrometer reading taken warm and reported uncorrected is not a lawful gauge. It does not address the obscuration correction required for spirits carrying dissolved solids, proofing with water and the volume contraction that occurs on mixing, barrel entry proof, warehouse losses and the treatment of those losses, or bottling and label proof tolerances. It does not compute recovery or predict cut points, which are a still and operator matter judged on the spirit rather than calculated. Distilled spirits production is federally permitted and regulated. The TTB regulations and gauging manual, the current excise rate schedule, and the distillery's own permitted procedures govern.
