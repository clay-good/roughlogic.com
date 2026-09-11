# roughlogic.com Specification v1802 -- UPS Module Sizing and N+1 Redundant Capacity (`calc-datacenter.js`, Group A Electrical, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Redundancy is bought by adding modules, and adding modules lowers the load fraction each one carries. A UPS is least efficient at low load, so every step up in redundancy costs efficiency -- and the losses are paid for twice, once at the meter and once at the chiller.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive IT load, module rating, tariff, or coefficient of performance, or a power factor or efficiency outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the redundancy configuration convention and the UPS loss relation with the manufacturer's efficiency curves and the applicable facility class requirements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ups module sizing`, `n+1 redundancy ups capacity`, `ups load fraction efficiency`, `2n ups configuration`, `ups losses cooling penalty`.

## 2. The tile

### 2.1 `ups-module-redundancy` -- UPS Module Sizing and N+1 Redundant Capacity

```
apparent power   kVA = IT load in kW / power factor; modern server supplies run
                 near 0.95 to 0.99, older equipment lower
N                ceil(kVA / module rating) -- the modules the load requires
N+1              one spare module; the load rides through a single module failure
                 or a module taken out for maintenance
2N               two independent systems, each capable of the whole load; the
                 configuration dual-corded equipment expects
load fraction    kVA / (modules x rating), which falls with every module added
efficiency       a double-conversion UPS is flattest near 40 to 80% load and falls
                 off below that; the curve is the manufacturer's, not a constant
losses           IT kW x (1/efficiency - 1), a continuous heat load
double cost      the losses are metered AND they must be cooled
```

Redundancy and efficiency are in direct tension and the tension is arithmetic rather than a matter of product
quality. A module's efficiency depends on how hard it is loaded, and the entire point of redundancy is to have
more capacity installed than the load requires -- so a more redundant system is, necessarily, a more lightly
loaded one. Each step from N to N+1 to 2N buys availability and pays for it in conversion losses that run
continuously for the life of the installation.

The losses are charged twice and only the first charge is obvious. Every kilowatt a UPS dissipates appears at
the meter, and every one of those kilowatts is also heat inside the building that the cooling plant has to
remove, at its own coefficient of performance. A site that accounts for UPS losses at the electricity tariff
alone is understating them by roughly a third.

Modularity is what makes the tension manageable, and it is why modular UPS systems displaced monolithic ones.
A system built from many small modules can have its installed capacity tracked to the actual load as the hall
fills, keeping each module in its efficient band while preserving the redundancy count. A single large unit
sized for the hall's eventual load spends its early years at a load fraction where its efficiency curve is
poor, and there is nothing the operator can do about it.

**Inputs:** the IT load and power factor, the UPS module rating, the efficiency at the N+1 and 2N load fractions, the electricity tariff, and the cooling plant coefficient of performance

**Outputs:** the apparent power, the module count for N, N+1, and 2N, the load fraction on each configuration, the losses at the entered efficiencies, the annual cost of those losses, the cooling cost to remove them, and the total penalty of the more redundant configuration

## 3. Worked example

A 500 kW IT load at 0.90 power factor, on 250 kVA modules:

```
apparent power = 500 / 0.90 = 555.6 kVA
N    = ceil(555.6 / 250) = 3 modules, loaded 74%
N+1  = 4 modules, loaded 56%
2N   = 6 modules, loaded 37%
```

**Each step of redundancy drops the load fraction.** At N the modules run 74% loaded, which is squarely in
the efficient band; at 2N they run 37%, which is below it.

**The efficiency difference is the whole cost:**

```
at 95.5% (N+1):  losses = 500 x (1/0.955 - 1) = 23.6 kW
at 94.0% (2N):   losses = 500 x (1/0.940 - 1) = 31.9 kW
difference = 8.4 kW, continuously
```

**8.4 kW does not sound like much until it is annualised:**

```
metered  = 8.4 kW x 8,760 x $0.10 = $7,319
cooling  = the same 8.4 kW removed at a COP of 3 = $2,440
total    = $9,758 per year
```

**$9,758 a year, forever, is the operating price of 2N over N+1** at this load -- before any capital,
floor space, or maintenance is counted. **And roughly 25 percent of it is the cooling bill**, which a site
accounting for UPS losses at the electricity tariff alone will miss entirely.

**None of which argues against 2N.** Dual-corded equipment expects two independent paths, and a concurrently
maintainable facility has to be able to take a whole system down. **It argues for knowing the number**, and for
sizing modules so the load fraction stays in the efficient band as the hall fills -- which is the case for
many small modules over one large one.

## 4. Scope and non-goals

A capacity and loss comparison. Efficiency at a given load fraction is the manufacturer's published curve for the specific unit and topology, and it varies enormously between double conversion, line-interactive, and eco-mode operation -- eco mode can add several points of efficiency and changes the transfer behaviour, which is a reliability decision rather than an energy one. The figures entered here are placeholders for that curve. It does not size batteries or establish autonomy (`standby-battery-runtime` and `battery-runtime` address runtime from capacity), design the distribution downstream (`pdu-branch-loading`), or address the static switch, bypass, and maintenance bypass arrangements that make a system concurrently maintainable. It does not evaluate availability: a module count is not a reliability calculation, and the single points of failure that actually determine uptime are usually in the distribution and the controls rather than in the module count. It takes no position on the tier or class a facility is designed to, which is a business decision with specific topology requirements. The UPS manufacturer's efficiency curves and topology data, the applicable facility class requirements, and the electrical designer govern.
