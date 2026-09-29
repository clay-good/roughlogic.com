# roughlogic.com Specification v1883 -- Solar Water Pump Array Sizing (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A solar pump is sized from the water, not from the load: daily gallons and lift set the array, and the pump runs only while the sun is up. The catalog sizes pumps from head and flow and sizes arrays from annual energy, and no tile goes from a daily water demand to a panel wattage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive daily demand, peak sun hours, total dynamic head, pump efficiency, or derate returns `{ error }`; an efficiency or derate above 1.0 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USDA NRCS North Dakota Technical Note No. 1, *Design of Small Photovoltaic (PV) Solar-Powered Water Pump Systems* (July 2017), Equations 5.1, 7.1, 7.3, and 7.5, named as the method, the pump manufacturer's performance curve named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`solar pump sizing`, `solar well pump panel size`, `pv water pump array`, `solar powered water pump calculator`, `off grid water pump solar`.

## 2. The tile

### 2.1 `solar-water-pump-sizing` -- Solar Water Pump Array Sizing

```
design flow     Q (gpm) = daily demand (gpd) / (peak sun hours x 60)   (Eq. 7.1)
pump input      P_in (W) = 0.1885 x TDH (ft) x Q (gpm) / pump efficiency
                (0.1885 W per gpm-ft = 8.34 / 33,000 x 745.7)          (Eq. 7.3)
array minimum   P_array = P_in / DRV, DRV = panel derate, typically 0.85 (Eq. 7.5)
workload        HW (m^4) = TDH (m) x daily volume (m^3)                (Eq. 5.1)
                under 1,500 suits solar; over 2,000 generally does not
storage         3 days of demand by default (the North Dakota NRCS requirement),
                since the pump makes nothing at night or under heavy overcast
```

A solar pump compresses a day's water into the sunny hours, so its design flow is the daily demand divided by the
peak sun hours, not by twenty-four. A 1,000 gallon-per-day need at 2.5 peak sun hours is a 6.6 gpm pump; the same
need served around the clock would be 0.7 gpm. The pump, and therefore the array, is sized to that compressed rate,
and the design month is the worst one -- the lowest peak sun hours in the season the water is needed.

The hydraulic workload is the NRCS screen for whether solar is the right tool at all. It multiplies lift by volume
in metric units, and a large number means either a deep well or a large demand, both of which push the array and the
pump into sizes where a generator or a grid connection is usually cheaper. Below the threshold, a small array and a
DC pump are the simplest water system there is, which is why they turn up in field clinics and relief camps.

Storage is part of the design, not an accessory. The array makes water only while the sun is up, so a tank has to
carry the night and any overcast days; North Dakota NRCS requires three days of demand, and the tile uses that as
its editable default. The tank is usually cheaper than
the batteries that would otherwise do the same job, and water stores more simply than electricity.

**Inputs:** the daily water demand, the design-month peak sun hours, the total dynamic head, the pump efficiency (or wire-to-water efficiency), the panel derate, and the storage days

**Outputs:** the design flow, the pump input power, the minimum array rating, the hydraulic workload and its suitability band, and the storage volume

## 3. Worked example

**The NRCS technical note's own example:** 1,000 gallons per day, 2.52 peak sun hours in the design month, 150 ft
total dynamic head, 60% pump efficiency:

```
Q        = 1,000 / (2.52 x 60) = 6.61 gpm
P_in     = 0.1885 x 150 x 6.61 / 0.60 = 311.7 W
array    = 311.7 / 0.85 = 366.7 W minimum
workload = 150 x 0.3048 x 1,000 x 3.7854 / 1,000 = 173.1 m^4 -> well suited
storage  = 3 x 1,000 = 3,000 gal
```

**A 367 W minimum array -- the NRCS reads 310 W off the pump curve**, and the difference is the curve's efficiency
at that operating point against the flat 60% entered here. The pump curve governs, and the tile says so.

**A field clinic well:** 600 gallons per day, 4.5 peak sun hours, 180 ft TDH, a small DC pump at 45%:

```
Q = 2.22 gpm   P_in = 167.6 W   array = 197.1 W   workload = 124.6 m^4
```

**A 200 W array** -- one or two modules -- with a 1,800 gallon tank for three days. The better sun cuts the flow
the pump must make, which is worth more than the deeper well costs.

## 4. Scope and non-goals

A preliminary array size from the NRCS method. It does not select a pump or read a pump curve, which governs the actual operating point and efficiency; it does not compute total dynamic head (`pump-tdh`, `friction-loss`), well drawdown (`well-drawdown`), or the site's peak sun hours, which come from the NREL solar resource data for the location and tilt. It does not size wiring, controllers, or batteries, and it assumes a direct-drive system without battery storage. It does not address water quality or treatment. The NRCS technical note, the pump and module manufacturers' data, and the AHJ govern.
