# roughlogic.com Specification v1777 -- Sparge Water and Pre-Boil Volume (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A large share of the water that goes into a mash never comes out of it, and the grain bill decides how much. The sparge volume is what is left after absorption and vessel losses are taken off the target, and on a big beer the mash swallows so much of the pre-boil volume that the sparge nearly disappears.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive grain weight, thickness, or absorption rate, a negative deadspace, or a computed sparge volume below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the brewhouse volume balance and typical grain absorption ranges with the brewery's own measured figures named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`sparge water volume`, `pre boil volume brewing`, `grain absorption gallons per pound`, `lauter runoff calculation`, `brewing water total`.

## 2. The tile

### 2.1 `sparge-water-volume` -- Sparge Water and Pre-Boil Volume

```
absorption       grain retains roughly 0.10 to 0.13 gal per pound of grist; it is
                 water that is paid for, heated, and thrown away with the spent grain
first runnings   mash water - absorption, the volume that drains before sparging
sparge           pre-boil target - first runnings + vessel deadspace
total water      mash water + sparge, which is the figure the hot liquor tank and
                 the water bill see
deadspace        the volume trapped below the false bottom, in the grant, and in the
                 transfer line; measured once per system and then constant
the scaling      absorption scales with GRAIN and the target scales with VOLUME, so
                 a high-gravity beer needs disproportionately more sparge
the limit        sparge volume is bounded by the lauter tun's freeboard above the
                 grain bed (`mash-tun-grain-bed`)
```

Absorption is the loss that brewers underestimate because it is invisible. The spent grain leaving the tun is
wet, and the water in it was mashed, heated, and then carted away, so a brewery's water and energy per barrel
are both set partly by a number nobody measures after the first time. On a large grist it is a substantial
fraction of the total water and it does not shrink when the batch size does.

The sparge is a residual, and residuals are sensitive. It is what remains after two independently chosen
quantities -- the mash water and the pre-boil target -- have been fixed, so an error in either lands entirely
on the sparge. Shift the mash thicker and the sparge grows; raise the pre-boil target and it grows again; and
because the tun has a finite freeboard, the sparge is the quantity that runs out of room first.

That is the constraint a high-gravity beer runs into. The recipe adds grain to raise the gravity, which raises
absorption and lowers the first runnings, while the pre-boil volume target does not move -- so the sparge has
to make up an ever larger share through a grain bed that is simultaneously deeper and slower to run off. A
brewhouse discovers its maximum gravity this way rather than by calculation.

**Inputs:** the grain weight, the mash thickness or mash water volume, the grain absorption per pound, the pre-boil volume target, and the vessel deadspace

**Outputs:** the mash water volume, the water absorbed by the grain, the first runnings, the sparge volume required, the total water for the batch, the absorption as a share of total water, and the same figures for a second grain bill

## 3. Worked example

The 542 lb grist at 1.25 qt per pound, targeting 350 gal pre-boil with 5 gal of deadspace:

```
mash water     = 169.4 gal
absorbed       = 542 x 0.125 = 67.8 gal
first runnings = 169.4 - 67.8 = 101.6 gal
sparge         = 350 - 101.6 + 5 = 253.4 gal
total water    = 169.4 + 253.4 = 422.8 gal
```

**68 gallons leave in the spent grain -- 16 percent of every gallon the brewery heated.** That is water
bought, treated, brought to strike temperature, and then wheeled out to a farmer, and it is the single largest
loss in the brewhouse.

**Notice that the sparge is doing most of the work.** 253 gal of sparge against 102 gal of first runnings
means **71 percent of the pre-boil volume arrives after the mash is drained**, which is why lauter
performance and sparge technique decide brewhouse efficiency far more than the mash does.

**Now raise the grain bill for a stronger beer, keeping everything else fixed:**

```
850 lb:  mash water = 265.6 gal, absorbed = 106.2 gal
        first runnings = 159.4 gal
        sparge = 350 - 159.4 + 5 = 195.6 gal
```

**The grain bill rose 57 percent and the sparge FELL by 23 percent**, because the thicker, larger mash now
carries most of the pre-boil volume itself. The water that used to be sparge is now mash water, and
38 more gallons of it are leaving in the grain.

**That is the squeeze a high-gravity brew day runs into.** The mash is bigger, the bed is deeper, the sparge is
smaller, and the extract that a generous sparge used to rinse out of the bed is left behind -- which is
exactly why brewhouse efficiency falls as gravity rises (`brewhouse-efficiency`), and why the total water
per barrel of finished beer gets worse at both ends of the gravity range.

## 4. Scope and non-goals

A volume balance. Grain absorption is entered and is a system and grist property rather than a constant: it varies with the crush, the grist composition, whether adjuncts or rice hulls are present, how hard the bed is pressed, and how long it drains, and a brewery establishes its own figure by measurement. Deadspace is likewise measured once per vessel set. It does not model the lauter itself -- runoff rate, channelling, a set bed, or the rinse efficiency that decides how much extract the sparge actually recovers (`brewhouse-efficiency`) -- and it does not check the volume against the tun's capacity (`mash-tun-grain-bed`). It does not address sparge water temperature and pH, which govern tannin extraction, the difference between batch and fly sparging, or no-sparge and brew-in-a-bag methods. It takes no position on water treatment or on spent grain handling and disposal. The brewery's own measured absorption and deadspace figures and the brewer govern.
