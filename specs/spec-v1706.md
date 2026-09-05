# roughlogic.com Specification v1706 -- Injection Shot Size, Barrel Capacity, and Residence Time (`calc-process.js`, Group G Cross-Trade Utilities, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A barrel that is too large for the shot holds the material at temperature far too long, and heat-sensitive resins degrade sitting there. Residence time is barrel capacity over shot size times cycle time, and it is why a big machine running a small part makes bad parts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive barrel capacity, shot size, or cycle time, or a shot size exceeding the barrel capacity returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the residence time relation and the usable shot window with the material supplier processing data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`injection residence time`, `barrel capacity shot size ratio`, `material degradation residence`, `20 to 80 percent shot`, `oversized machine small part`.

## 2. The tile

### 2.1 `shot-size-residence-time` -- Injection Shot Size, Barrel Capacity, and Residence Time

```
residence time    t = (barrel capacity / shot size) x cycle time
shot size         part weight plus runner, converted to the machine's shot volume
usable range      commonly 20 to 80 percent of barrel capacity
                  below 20% the residence time is excessive; above 80% the melt may be
                  inadequately plasticized
degradation       heat-sensitive resins (PVC, POM, PC, some flame-retardant grades)
                  discolour, lose properties, and can evolve gas
consequence       splay, brittleness, discoloration, and in the worst case corrosion
                  of the barrel and screw
```

The ratio is the whole story. A machine whose barrel holds ten shots of a small part keeps material at melt
temperature for ten cycles before it is used, and if the cycle is thirty seconds that is five minutes of residence
-- which is fine for polypropylene and destructive for PVC or acetal. Running a small part on a large machine
because it is the one available is the standard cause, and the defect appears as splay, colour drift, or brittle
parts that pass dimensional inspection.

The upper bound exists too. Using more than about eighty percent of barrel capacity gives the screw too little
time and length to melt and homogenize the material, so the shot is inconsistently plasticized and the parts vary.
The usable window between the two bounds is what makes machine selection a real decision rather than a matter of
tonnage alone.

The material is what sets the tolerance. Polyolefins are forgiving of long residence; PVC evolves hydrogen
chloride as it degrades, which attacks the screw and barrel as well as ruining parts; acetal can decompose
exothermically. So the residence limit is a material property from the supplier's processing data, and
"it looks fine" is not a check for a resin that degrades without an obvious visual signal.

**Inputs:** the barrel rated capacity in the material, the part and runner weight, the material density and the machine rating basis, the cycle time, and the material maximum residence time

**Outputs:** the shot size as a percentage of barrel capacity, the residence time in minutes, that against the material limit, the machine size that would put the shot in the usable window, and the residence time at an alternative cycle time

## 3. Worked example

A 4.2 oz shot in a 12 oz barrel on a 32 second cycle:

```
shot as percent of capacity = 4.2 / 12 = 35%
residence time = (12 / 4.2) x 32 = 2.9 shots x 32 s = 1.5 minutes
```

35 percent is inside the 20 to 80 window and 1.5 minutes is fine for a polyolefin.

**Now run the same part on a 40 oz machine** because it is the one free:

```
shot as percent = 4.2 / 40 = 10%
residence time  = (40 / 4.2) x 32 = 5.1 minutes
```

**10 percent of capacity and 5.1 minutes of residence.** On polypropylene that is
survivable. On PVC it is not -- the material degrades, evolves hydrogen chloride, and the damage is to the screw
and barrel as well as to the parts. On acetal it is a decomposition risk.

The parts that come off will often pass dimensional inspection and fail on properties, which is the worst kind of
defect: it ships.

**The other bound**: a 4.2 oz shot in a 5 oz barrel is 84 percent of capacity, and the screw has too little
time and stroke to melt and homogenize it, so shot-to-shot consistency suffers. The window exists on both sides,
and it is why machine selection is not just a tonnage question.

## 4. Scope and non-goals

A residence time calculation. Barrel capacity ratings are stated in a reference material (commonly polystyrene)
and must be converted for the actual material's density -- using the nameplate rating directly for a denser or
lighter resin misstates the ratio. Maximum residence time is a material property from the supplier's processing
data and varies widely; some grades tolerate long residence and others degrade in minutes. It does not model
degradation, which depends on temperature as well as time and which is accelerated by hot spots, shear, and
contamination. It does not address purging, colour changeover, or the material handling and drying that most
engineering resins require -- undried hygroscopic material degrades by hydrolysis regardless of residence time.
It does not size a machine (`injection-clamp-tonnage`). The material supplier's processing data sheet, the machine
manufacturer's ratings, and the process engineer govern.
