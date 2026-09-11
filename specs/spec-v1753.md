# roughlogic.com Specification v1753 -- Horticultural Fixture Count for a Target PPFD (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Sizing a supplemental lighting array is a photon budget, not a wattage rule: the fixtures have to put a stated number of micromoles per second onto a stated area, and the fraction that lands on the crop rather than the aisle is what decides the count.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, target PPFD, fixture PPF, or input wattage, or an on-target fraction outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the photon-budget relation and the efficacy definition with the fixture manufacturer's photometric report and the horticultural literature named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`grow light fixture count`, `supplemental lighting layout`, `ppf to ppfd fixture`, `horticultural lighting design`, `led fixture efficacy umol per joule`.

## 2. The tile

### 2.1 `grow-light-fixture-count` -- Horticultural Fixture Count for a Target PPFD

```
area             convert the growing area to square meters; PPFD is a metric quantity
photons needed   total micromol/s = target PPFD x area in m^2
PPF              a fixture's total photon output in micromol/s, from the
                 manufacturer's photometric report -- NOT its wattage
on-target        the fraction of PPF that lands on the crop rather than on aisles,
                 walls, and structure; commonly 0.80 to 0.95
count            fixtures = photons needed / (PPF x on-target fraction), rounded up
efficacy         micromol per joule = PPF / input watts; roughly 1.7 for HPS and
                 2.5 to 3.5 for current LED
heat             every input watt becomes about 3.412 Btu/h in the house, and none
                 of it leaves as light
```

A fixture is bought on wattage and specified on photons, and confusing the two is how lighting plans go wrong.
Two fixtures drawing the same power can differ by half in photon output, so the count that hits a PPFD target
depends on the photometric report and not on the connected load. Efficacy in micromoles per joule is the
number that connects them, and it is the single figure worth comparing between products.

The on-target fraction is where an honest plan separates from an optimistic one. A fixture's PPF is measured
into a sphere; the crop occupies a rectangle. Photons that land in the aisle, on the wall, or on the structure
were paid for and are not grown with, and in a narrow house or a small bay that loss is large. Raising the
fixtures improves uniformity and lowers the on-target fraction at the same time, which is the trade every
layout is making whether or not it is stated.

Every watt becomes heat, and in a greenhouse that is a two-season fact. In winter the lighting load offsets
part of the heating bill, which is a real credit. In a warm shoulder season the same load is a cooling burden
arriving exactly when the sun is already strong, and a lighting array sized for December can be the reason a
house overheats in March.

**Inputs:** the growing area, the target supplemental PPFD, the fixture PPF and input watts, the on-target fraction, the photoperiod, the season length, and the energy rate

**Outputs:** the total photons required, the effective photons per fixture, the fixture count rounded up, the connected load and watts per square meter, the fixture efficacy in micromol per joule, the seasonal energy and cost, and the heat added to the house

## 3. Worked example

A 1,000 sq ft bay wanting 200 micromol/m^2/s of supplemental light:

```
area          = 1,000 / 10.7639 = 92.9 m^2
photons       = 200 x 92.9 = 18,581 micromol/s
per fixture   = 1,700 PPF x 0.90 on target = 1,530 micromol/s
count         = 18,581 / 1,530 = 12.14 -> 13 fixtures
```

**The 90% on-target fraction costs a fixture by itself.** At a perfect 1.00 the count would be
10.93, which rounds to 11; at 0.90 it is 12.14, which rounds to 13. A fraction that most plans never
state is deciding the order quantity.

**The connected load is the part the electrician needs and the grower feels.**

```
load     = 13 x 645 W = 8,385 W = 90.3 W/m^2
efficacy = 1,700 / 645 = 2.64 micromol per joule
```

At 2.64 micromol per joule these are efficient LED fixtures; an HPS array near 1.7 would need roughly
1.6 times the input power to put the same photons on the same crop.

**Run it 16 hours a day for a 180 day season and the energy is the real cost:**

```
energy = 8,385 W x 16 h x 180 days = 24,149 kWh
cost   = 24,149 x $0.12 = $2,898
```

**And all 8,385 W arrives in the house as heat: 28,610 Btu/h.** In December that is a credit against the heating
load. In a bright March afternoon with the same lights on a photoperiod timer, it is 28,610 Btu/h of cooling
the vents have to remove on top of the sun -- which is why lighting and ventilation are one control decision,
not two.

## 4. Scope and non-goals

A photon-budget sizing estimate. It does not lay out the array or predict uniformity, which depend on mounting height, fixture beam distribution, reflector geometry, and the bay's proportions -- a photometric layout from the manufacturer's files is what establishes the actual PPFD map, and the on-target fraction here stands in for all of it. It does not select a spectrum or take any position on spectral quality, which is a cultivar and crop-stage decision. It does not size the electrical service, branch circuits, or controls for the array (`branch-circuit-wire-footage` and the Group A tiles address that), address fixture derating at temperature, or compute the net heating credit against a house load. Photometric reports are measured under specific conditions and field output differs. The fixture manufacturer's photometric data, the crop's producer guide, and the electrical designer govern.
