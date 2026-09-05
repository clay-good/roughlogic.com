# roughlogic.com Specification v1554 -- Wind Turbine Output Air-Density Correction (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A power curve is warranted at sea level and 59 degF. A turbine on a high plain on a hot afternoon is breathing air a fifth less dense, and its output falls by exactly that fraction. Skipping the correction overstates production at every high-altitude site in the country.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive absolute temperature or reference density, or a negative elevation returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the density relation and the IEC 61400-12 cube-root wind speed correction by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`air density correction wind turbine`, `altitude derate wind power`, `power curve density correction`, `iec density correction`, `hot day turbine output`.

## 2. The tile

### 2.1 `turbine-density-correction` -- Wind Turbine Output Air-Density Correction

```
density        rho = rho_0 x (T_0 / T) x exp( -z / 27,000 )      (approximate, degR, ft)
power ratio    P / P_ref = rho / rho_ref        (power is LINEAR in density)
corrected wind IEC method instead corrects the wind speed: v_corr = v (rho/rho_0)^(1/3)
reference      1.225 kg/m3 = 0.0765 lb/cu ft at 59 degF, sea level
```

Power is linear in density and cubic in speed, so the two corrections are applied differently. Density falls
with altitude and with temperature, and both effects run the same way on a hot summer afternoon at elevation --
which is precisely when the grid wants the power most. A site at 5,000 ft on a 95 degF day is running near 80% of
the sea-level density, and therefore near 80% of the warranted curve.

The IEC convention is worth knowing because it is what a performance test uses: rather than scaling power, it
scales the measured WIND SPEED by the cube root of the density ratio and then reads the standard power curve.
The two approaches agree in the region where power is roughly cubic in speed and diverge near rated, where the
machine is power-limited and density affects only where rated is reached, not the rated value itself.

For a technician the practical use is diagnostic: a machine that looks like it is underperforming its curve on a
hot day at altitude may be performing exactly as it should, and this correction is what distinguishes a fault
from physics.

**Inputs:** site elevation, air temperature, barometric pressure if measured, the reference density for the power curve, and the measured or rated power

**Outputs:** the site air density, the ratio to the reference density, the density-corrected power, the density-corrected wind speed by the IEC cube-root method, and the output at an alternative temperature to show the seasonal swing

## 3. Worked example

A site at 5,200 ft on a 95 degF afternoon, against a power curve warranted at 0.0765 lb/cu ft:

```
rho = 0.0765 x (519 / 554.7) x exp(-5,200/27,000)
    = 0.0765 x 0.9357 x 0.8248 = 0.05904 lb/cu ft
ratio = 0.05904 / 0.0765 = 0.772
```

**77% of reference density**, so a machine reading 1,850 kW where the curve says 2,200 kW is
delivering `1,850 / 2,200` = 84% of the curve against a 77% density -- performing correctly, not
faulted.

The seasonal swing at the same site: on a 20 degF winter morning the density is

```
rho = 0.0765 x (519 / 479.67) x 0.8248 = 0.06827
```

which is 116% of the summer value -- so the same wind makes
16% more power in winter. Density alone, no wind change.

The IEC form, correcting speed instead: a measured 20 mph on the summer day reads as
`20 x 0.9173` = 18.3 mph against the standard curve.

## 4. Scope and non-goals

A density correction using an approximate barometric relation. Where a measured barometric pressure is
available it is better than an elevation estimate, and humidity has a small further effect not modelled here.
The linear power correction is valid below rated wind speed where the machine is aerodynamically limited; above
rated the turbine is power-limited and density affects only the wind speed at which rated is reached, so applying
a linear density correction to rated power is wrong. Pitch-regulated and stall-regulated machines respond
differently to density and the manufacturer's method governs. It does not evaluate whether a machine meets its
warranted curve, which is a formal measurement to IEC 61400-12 with defined sectors, filtering, and uncertainty.
The turbine manufacturer's power curve, its stated reference conditions and correction method, and IEC 61400-12
govern.
