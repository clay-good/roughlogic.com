# roughlogic.com Specification v1840 -- PON Split Ratio and Optical Loss Budget (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** In a passive optical network the splitter, not the fibre, spends the loss budget. Two thirds of a class B+ budget is gone before a single kilometre is run, and every doubling of the split ratio costs three more decibels and most of the remaining reach.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive budget, split ratio, or attenuation coefficient, a negative excess or component loss, or a budget consumed before any fibre is run returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the logarithmic split loss relation and published PON class budgets with the applicable PON standard and the transceiver and splitter datasheets named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pon split ratio loss budget`, `gpon class b+ budget`, `optical splitter loss db`, `fiber to the home reach`, `1x32 splitter insertion loss`.

## 2. The tile

### 2.1 `pon-split-loss-budget` -- PON Split Ratio and Optical Loss Budget

```
class budget     the optical path loss the transceivers support; a GPON class B+
                 budget is about 28 dB and other classes differ
splitter loss    ideal = 10 log10(N) for an N-way split, plus an excess loss of
                 roughly 1 to 3 dB for uniformity and manufacture
the doubling     each doubling of the split ratio adds 3.01 dB, exactly
connectors       count every mated pair in the path -- and a PON path has several
                 more than people count
splices          fusion splices at each reel change and at the splitter
fibre            the attenuation coefficient at the WORST of the two wavelengths
                 in use; upstream 1310 nm is lossier than downstream 1490
reach            (budget - splitter - connectors - splices - margin) / attenuation
the shape        the splitter dominates; the fibre gets what is left
```

A passive optical network is a power divider and that is the whole design constraint. One transmitter feeds
many subscribers through a passive tree, so its power is split among them, and splitting is subtraction in
decibels. The relation is exact and unforgiving: every doubling of the number of subscribers on a feeder costs
3.01 dB, whatever the equipment, the fibre, or the installation quality.

Because the splitter is so large a share of the budget, the fibre plant matters less than intuition suggests
and the connector count matters more. Kilometres of fibre cost a few tenths of a decibel each; a mated
connector pair costs half a decibel and a PON path contains several of them -- at the terminal, at the
splitter housing, at the network interface, and wherever a patch was made for convenience. A path with two
extra connector pairs has given up more budget than several kilometres of fibre.

The split ratio is therefore a business decision expressed in decibels. A higher ratio serves more subscribers
per feeder fibre and per transceiver port, which is the whole economic case for the architecture; it also
shortens the reach and reduces the bandwidth each subscriber can be offered, because the shared capacity
divides the same way the light does. Operators choose the ratio by what the plant's geography can support and
then live with it, because changing it later means re-splicing the tree.

**Inputs:** the class optical path loss budget, the split ratio and the splitter's excess loss, the connector and splice counts and their per-item losses, the fibre attenuation at the worst wavelength, the design margin, and an alternative split ratio

**Outputs:** the splitter loss ideal and with excess, the connector and splice losses, the budget remaining for fibre, the reach in kilometres, the splitter's share of the total budget, and the same figures at the alternative split ratio

## 3. Worked example

A class B+ budget of 28 dB on a 1:32 split:

```
splitter = 10 log10(32) + 2.5 excess = 15.05 + 2.5 = 17.55 dB
connectors (4 pairs x 0.5) = 2.0 dB
splices (6 x 0.1)          = 0.6 dB
left for fibre = 28 - 17.55 - 2.0 - 0.6 = 7.85 dB
reach = 7.85 / 0.35 dB/km = 22.4 km
```

**The splitter alone is 63% of the whole budget.** The fibre -- the thing the network is made of -- gets
28% of it, which buys 22.4 km.

**Now double the split ratio to serve twice as many subscribers per feeder:**

```
splitter = 10 log10(64) + 2.5 = 20.56 dB
left for fibre = 4.84 dB
reach = 13.8 km
```

**3.01 dB more -- exactly the 3.01 dB of a doubling plus nothing else -- and the reach falls from 22.4 to
13.8 km.** Half the coverage radius for twice the subscribers per port, which is the entire architectural
trade stated in two numbers.

**Note where the leverage is not.** A kilometre of fibre costs 0.35 dB. **A single extra mated connector pair
costs 0.5 dB, which is 1.4 km of reach** -- so two convenience patches in a path give up 2.9 km of reach, more
than a tenth of the whole design distance. **In a PON the connectors are worth counting and the fibre nearly takes
care of itself.**

**And the wavelength choice is not free either.** This uses 0.35 dB/km, the worse of the two directions;
computing the budget at the downstream wavelength alone would overstate the reach, because **the link has to
close in both directions.**

## 4. Scope and non-goals

A budget calculation. Class budgets, their maximum and minimum path loss, and the differential loss between subscribers are set by the applicable PON standard and by the transceiver specifications, and both ends of the range matter -- a subscriber too CLOSE to the terminal can overload the receiver, which is why a minimum path loss exists and why very short drops sometimes need attenuation. Splitter excess loss and uniformity vary by construction and split ratio and come from the component's datasheet; a cascaded two-stage split has different total loss and different uniformity from a single-stage one. Attenuation coefficients differ between wavelengths and the budget must close at the worst of them, including any water-peak or bend-sensitivity behaviour of the fibre in use. It does not address the design margin, which is an operator policy covering ageing, future splices, repairs, and temperature, and which must be reserved before the reach is computed. It does not address split architecture and where splitters are placed, bandwidth sharing among subscribers, optical return loss and reflectance limits (`optical-return-loss`), or the wavelength plan where video or next-generation PON overlays are carried. The applicable PON standard, the transceiver and splitter datasheets, and the network engineer govern.
