# roughlogic.com Specification v1436 -- Bucket Elevator Capacity, Speed, and Power (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group L has grain bins, augers, and screw conveyor capacity but nothing for the bucket elevator, which is how grain actually gets to the top of a bin. Capacity is a bucket-volume-and-speed calculation with a fill factor that is never 100%, and the power is dominated by lift, not by friction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive bucket volume, spacing, belt speed, or lift height, or a fill factor or efficiency outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the bucket-elevator volumetric capacity relation (bucket volume x buckets per foot x speed x fill factor) and the lifting-power relation P = W H / 33,000, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `bucket-elevator-capacity` -- Bucket Elevator Capacity, Speed, and Power

```
buckets per foot  = 12 / bucket spacing in inches
capacity (ft3/hr) = bucket volume x buckets per foot x speed (fpm) x 60 x fill factor
mass rate         = capacity x material bulk density
lifting hp        = mass rate per minute x lift height / 33,000
motor hp          = lifting hp / drive efficiency x scoop and friction allowance
```

The capacity chain is straightforward and the fill factor is where the honesty lives. A bucket elevator does not
fill its buckets: at the boot the buckets scoop or are fed, and how much they pick up depends on the material's
flowability, the boot design, and the speed. Seventy-five percent is a working figure for free-flowing grain and
considerably less for a sluggish material. Rating an elevator at 100% fill is how a system that was bought for 20
tons an hour delivers 15.

Power is dominated by lift. In the worked example below, the lifting term is nearly all of it -- friction, scoop
resistance, and drive losses are the smaller corrections, which is the opposite of a horizontal conveyor. That
means elevator power scales almost linearly with height and with tonnage and is quite insensitive to everything
else.

**Inputs:** bucket volume (cubic ft), bucket spacing (in), belt or chain speed (fpm), fill factor, material bulk
density, lift height, drive efficiency, scoop and friction allowance.

**Outputs:** buckets per foot, volumetric capacity, mass rate in lb/hr and tons/hr, bushels per hour for grain,
lifting horsepower, and motor horsepower.

## 3. Worked example

Buckets of 0.05 cubic ft on 8 in spacing, belt at 250 fpm, 75% fill, lifting grain at 48 lb/cubic ft up 60 ft,
75% drive efficiency, 20% scoop and friction allowance:

```
buckets per foot = 12 / 8                       = 1.5
capacity         = 0.05 x 1.5 x 250 x 60 x 0.75 = 844 cubic ft/hr
mass rate        = 844 x 48                     = 40,500 lb/hr = 20.3 tons/hr = 678 bu/hr
lifting hp       = (40,500/60) x 60 / 33,000    = 1.23 hp
motor hp         = 1.23 / 0.75 x 1.20           = 1.96 hp  -> a 2 hp motor
```

Two horsepower to lift twenty tons an hour sixty feet, which is why bucket elevators are the cheapest vertical
conveying there is. Note the fill factor's leverage: at 60% fill rather than 75% the same machine delivers 16.2
tons per hour, and no amount of extra motor recovers it -- the fix is at the boot, not at the drive.

## 4. Scope and non-goals

Steady-state capacity and power. It does not size the belt or chain, which is a tension calculation, the head and
boot pulleys, the shafting, or the takeup. Discharge behavior -- centrifugal, continuous, or positive -- depends on
speed and pulley diameter and governs whether the material actually leaves the bucket rather than falling back
into the boot, and this tile does not check it; running an elevator too slow for centrifugal discharge is a common
and expensive mistake. It does not address backstops, which every inclined or vertical elevator needs, alignment
and rub monitoring, or the **grain dust explosion hazard**, which makes bucket elevators one of the most
regulated pieces of equipment in agriculture under OSHA 1910.272 and NFPA 61. The equipment manufacturer, OSHA,
and NFPA govern.
