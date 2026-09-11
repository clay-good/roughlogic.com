# roughlogic.com Specification v1759 -- Propagation Plug Tray Count and Transplant Schedule (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A propagation order is placed in finished plants and sown in tray cells, and between the two sit germination and culling. Sowing the order divided by the cell count always comes up short, and the shortfall is discovered at transplant when there is no time left to sow again.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive order quantity or cell count, a germination or cull rate outside 0 to 1, or a germination rate of zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the germination and cull compounding relation with the seed supplier's lot data and the crop producer guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`plug tray count`, `propagation seeding quantity`, `germination rate tray sowing`, `transplant plug order`, `bedding plant tray math`.

## 2. The tile

### 2.1 `plug-tray-cell-count` -- Propagation Plug Tray Count and Transplant Schedule

```
cell count       trays are sold by cells per tray: 72, 128, 200, 288, 512 are common,
                 and the standard footprint is about 11 x 21 in for all of them
usable per tray  cells x germination rate x (1 - cull rate)
trays            finished plants required / usable per tray, ROUNDED UP
seed             trays x cells x seeds per cell
finished         trays x cells x germination x (1 - cull) -- the honest yield of the
                 sowing, which is what the transplant crew will actually receive
bench area       trays x about 1.60 sq ft per standard tray, before aisles
the error        dividing the order by the cell count assumes every cell finishes,
                 and no propagation house has ever done that
```

Germination rate and cull rate are two different losses and they compound. A seed lot at 92 percent
germination has already given up 8 percent before anything else happens, and the plants that do come up are
then graded: the runts, the doubles, and the ones that missed the window are pulled at transplant. Multiplying
the two is the only honest way to plan the sowing, and the product is always noticeably below either factor
alone.

Rounding up is not a rounding convention here, it is the whole operational point. A tray is an indivisible
unit that occupies a fixed footprint on a bench and takes a fixed slot in the seeder, so a calculation
returning 47.7 trays means 48 trays are sown and a small surplus is carried. The surplus is deliberate and
cheap; the shortfall it prevents is neither, because a plug crop cannot be topped up -- a second sowing is
weeks behind the first and will not transplant with it.

Cell size is a schedule decision more than a space decision. A larger cell finishes a more forgiving plug that
holds longer before it must go out, and a smaller cell puts more plants on the same bench but narrows the
transplant window. The bench area this returns is the propagation footprint only; the transplanted crop needs
several times that area at the other end, and the two are rarely available at the same moment.

**Inputs:** the number of finished plants required, the cells per tray, the germination rate, the cull rate, the seeds per cell, and optionally the tray footprint

**Outputs:** the usable plants per tray, the trays to sow rounded up, the total cells and seed required, the finished plants the sowing actually yields, the propagation bench area, and the tray count a naive order-divided-by-cells would have given

## 3. Worked example

An order for 12,000 finished plants in 288-cell trays, seed at 92% germination and a 5% cull at transplant:

```
usable/tray = 288 x 0.92 x (1 - 0.05) = 251.7 plants
trays       = 12,000 / 251.7 = 47.67 -> 48 trays
seed        = 48 x 288 = 13,824 cells sown
yield       = 13,824 x 0.92 x (1 - 0.05) = 12,082 finished plants
```

**48 trays, not 42.** Dividing the order by the cell count gives 41.7 trays, which rounds to 42 -- and those
42 trays would yield only 10,572 finished plants against an order for 12,000. **The naive count is short by
1,428 plants, about 12 percent of the order**, and the shortage is found at transplant, when a
re-sow is weeks too late to ship with the crop.

**Rounding up buys a deliberate surplus, and it is small.** The 48 trays yield 12,082 finished plants against an
order for 12,000 -- a cushion of 82 plants, about 0.7 percent. That is the right size for a cushion: large
enough to absorb a bad flat, small enough that the surplus is not a second crop to find bench space for.

**The bench needs 77 sq ft before aisles.** At 1.60 sq ft per standard tray, 48 trays occupy 77 sq ft of
propagation bench -- and the transplanted crop will need several times that when it goes out, which is a
different bench on a different date and the reason propagation and finishing space are scheduled together.

## 4. Scope and non-goals

A quantity and scheduling calculation. Germination and cull rates are entered, not predicted: the germination figure on a seed lot's tag is a laboratory result under controlled conditions and the house rate is commonly lower, while the cull rate depends on the crop, the seeder, the media, and the grader's standard. It does not schedule the crop in time -- days to germination, days to transplant, and the finishing period are crop and temperature dependent and belong to the producer guide. It does not address seeder calibration, multi-seeding or pelleted seed, media volume for the trays (`substrate-container-volume`), or the environmental control of the propagation area (`vapor-pressure-deficit` is the relevant screen there). It does not size the finished-crop bench space or handle a staged or successional sowing. The seed supplier's lot data, the crop's producer guide, and the propagation grower's own records govern.
