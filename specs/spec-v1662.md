# roughlogic.com Specification v1662 -- Wet Film Thickness for a Target Dry Film Build (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, auto body, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; auto body and refinishing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Coating thickness is specified dry and applied wet, and the bridge is the volume solids. A painter checking wet film with a gauge needs to know what wet reading produces the specified dry build, and reduction changes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a volume solids fraction outside zero to one, a non-positive dry film target, or a negative reduction ratio returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the volume solids film thickness relation with the coating manufacturer technical data sheet named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`wet film thickness calculation`, `dry film build volume solids`, `wft dft gauge`, `coating reduction solids`, `mils wet for mils dry`.

## 2. The tile

### 2.1 `wet-film-for-dry-build` -- Wet Film Thickness for a Target Dry Film Build

```
dry film build    DFT = WFT x volume solids
wet film needed   WFT = DFT / volume solids
reduction         thinning lowers the volume solids proportionally:
                  solids_reduced = solids / (1 + reduction ratio)
coverage          theoretical sq ft/gal = 1,604 x volume solids / DFT (mils)
per coat          the specification's total build divided among the coats
measurement       a wet film gauge while spraying; a dry film gauge after cure
```

Volume solids is the fraction of the wet coating that stays behind after the solvent leaves, so the wet film has
to be thicker than the target dry film by exactly that factor. A coating at 45 percent solids needs a wet film
more than twice the dry target, and a painter working to the dry number with a wet gauge will apply half the
specified build.

Reduction is the term that moves it and it is easy to lose track of. Thinning a coating dilutes the solids, so a
25 percent reduction takes 45 percent solids down to `45 / 1.25` = 36 percent and the required wet film rises
correspondingly. A shop that changes reduction for spray conditions -- hotter weather, a different gun -- has
changed the wet film target and usually has not changed the gauge reading it is working to.

The consequence runs both ways and both are failures. Under-build gives poor hiding, reduced durability, and on a
clearcoat, insufficient UV protection; over-build gives solvent entrapment, sags, extended cure, and on some
coatings cracking. Manufacturers specify a range rather than a number for exactly this reason, and the wet film
gauge is how a painter stays inside it while the coating is still wet enough to fix.

**Inputs:** the specified dry film thickness, the coating volume solids, the reduction ratio, the number of coats, and the coverage rate

**Outputs:** the wet film thickness required for the target dry build, the volume solids after the entered reduction, the wet film per coat, the theoretical coverage in square feet per gallon, and the dry build a stated wet reading produces

## 3. Worked example

A coating at 45% volume solids, specified at 2.0 mils dry:

```
WFT = 2.0 / 0.45 = 4.44 mils wet
```

**4.4 mils wet for 2.0 dry** -- more than double, which is why a painter working to the dry number
with a wet gauge applies half the specification.

Now reduce it 25 percent for spray conditions:

```
solids after reduction = 0.45 / 1.25 = 0.360
WFT                    = 2.0 / 0.360 = 5.56 mils wet
```

The wet film target rises from 4.4 to 5.6 mils for the same dry build. A shop that
adds reducer for a hot day and keeps spraying to the old wet reading is now
20% under build -- and on a clearcoat that is UV protection the customer
paid for and is not getting.

Coverage:

```
theoretical = 1,604 x 0.45 / 2.0 = 361 sq ft per gallon at 2.0 mils dry
```

and that is before transfer efficiency (`spray-transfer-efficiency`), which is what turns a theoretical coverage
into a purchase quantity.

## 4. Scope and non-goals

A film thickness conversion using volume solids from the coating manufacturer's technical data sheet. Volume
solids figures are for the coating as supplied and must be adjusted for reduction; the manufacturer's data sheet
gives both the recommended reduction and often the resulting wet film target directly, and that guidance
supersedes this calculation. It does not address application conditions -- temperature, humidity, flash time
between coats, and cure schedule -- which determine whether the applied film actually achieves its properties, or
the recoat windows outside which adhesion suffers. It does not address surface preparation, primer and sealer
selection, or compatibility between products from different systems, which is where most coating failures
originate. It does not address the health hazards of refinishing coatings, particularly isocyanate exposure,
which requires supplied-air respiratory protection. The coating manufacturer's technical data sheet, the vehicle
manufacturer's repair procedures, and OSHA govern.
