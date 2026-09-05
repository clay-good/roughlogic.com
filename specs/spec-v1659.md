# roughlogic.com Specification v1659 -- Spray Gun Transfer Efficiency and Material Usage (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, auto body, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; auto body and refinishing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Transfer efficiency is the fraction of what leaves the gun that lands on the panel, and the rest is overspray -- material bought, sprayed, filtered, and thrown away. It sets how much paint a job actually consumes and it is the number behind every VOC regulation on spray equipment.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a transfer efficiency outside zero to one, or a non-positive coverage or material requirement returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the transfer efficiency relation with the applicable air district refinishing rule and the coating manufacturer data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`spray transfer efficiency`, `hvlp material savings`, `overspray percentage`, `paint usage per job`, `transfer efficiency voc`.

## 2. The tile

### 2.1 `spray-transfer-efficiency` -- Spray Gun Transfer Efficiency and Material Usage

```
transfer efficiency  TE = material deposited / material sprayed
typical values       conventional siphon gun 25 to 35%, HVLP 55 to 70%,
                     electrostatic higher still
material required    M = coverage needed / TE
regulatory           many jurisdictions require HVLP or equivalent for refinishing
overspray            (1 - TE) becomes filter loading, booth contamination, and emissions
cost                 material is a large share of a refinish job; TE multiplies it directly
```

Transfer efficiency multiplies material consumption directly, so the difference between a 35 percent gun and a
65 percent gun is not a refinement -- it is nearly half the paint. On a shop spraying meaningful volume that is a
large annual number, and it is the reason HVLP became both the regulatory requirement and the economic default.

The regulatory dimension follows from the same arithmetic. Overspray is emitted VOC and it is captured by booth
filters, so a low-efficiency gun increases emissions per job, loads filters faster, and contaminates the booth
more -- three costs beyond the material. Air quality rules in most areas now require HVLP or an equivalent
demonstrated transfer efficiency for refinishing, and equipment that does not meet it is not compliant regardless
of how it sprays.

Technique matters as much as equipment. Gun distance, overlap, travel speed, air pressure, and fluid delivery all
move the achieved efficiency well away from the equipment's rated figure, and a well-set HVLP gun in poor hands
can transfer no better than a conventional gun in good ones. Measuring a shop's actual consumption per panel
against theoretical coverage is what establishes the real number.

**Inputs:** the theoretical coverage required, the transfer efficiency of the equipment and technique, the material cost, the number of jobs, and the alternative equipment efficiency for comparison

**Outputs:** the material required at the entered transfer efficiency, the overspray fraction and quantity, the material required at an alternative efficiency, the material and cost saved, and the annual saving across a stated job count

## 3. Worked example

A job needing 1.2 quarts of applied material, sprayed with a conventional gun at 35% transfer
efficiency:

```
material sprayed = 1.2 / 0.35 = 3.43 quarts
overspray        = 2.23 quarts, 65% of what left the gun
```

**2.23 quarts thrown away** on a job that needed 1.2.

With an HVLP gun at 65 percent:

```
material sprayed = 1.2 / 0.65 = 1.85 quarts
saving           = 1.58 quarts per job
```

At $90 a quart and 700 jobs a year:

```
1.58 x 90 x 700 = $99,692 per year
```

That is before counting the filter loading, the booth cleaning, and the emissions -- all of which scale with the
overspray too.

The technique caveat: the 65 percent figure is what the equipment can do, not what a given operator achieves.
Distance, overlap, and travel speed move it substantially, and the honest way to know a shop's real number is to
divide theoretical coverage by actual measured consumption over a month.

## 4. Scope and non-goals

A material consumption calculation from a transfer efficiency the user supplies. Rated transfer efficiencies
are laboratory or standardized-test values and real achieved efficiency depends heavily on operator technique,
part geometry, and gun setup; a shop's measured consumption is the better basis. It does not select spray
equipment or address the regulatory requirement, which in most jurisdictions specifies HVLP or an equivalent
demonstrated transfer efficiency and carries recordkeeping obligations -- the applicable air district rule
governs. It does not compute theoretical coverage, which comes from the coating manufacturer's technical data
sheet at the specified film build, or address mixing ratios and reduction. It does not address booth airflow,
filtration, or the respiratory protection and isocyanate exposure controls that refinishing requires, which are
health and safety matters. The coating manufacturer's technical data, the applicable air quality regulation, and
OSHA govern.
