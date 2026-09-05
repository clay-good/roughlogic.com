# roughlogic.com Specification v1675 -- Insulation Thickness for a Personnel-Protection Surface Temperature (`calc-hvacsystems.js`, Group C HVAC, mechanical insulation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; mechanical insulation), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Insulation on a hot line is sometimes there for energy and sometimes to keep a surface cool enough to touch, and the two thicknesses are different. Personnel protection is a surface-temperature calculation, and it usually asks for less insulation than the energy case does.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe temperature, ambient temperature, or thermal conductivity, or a target surface temperature at or below ambient returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the surface temperature heat balance with ASTM C1055 contact burn criteria named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`personnel protection insulation thickness`, `insulation surface temperature 140`, `burn protection pipe insulation`, `jacket surface temperature touch`, `hot pipe insulation thickness`.

## 2. The tile

### 2.1 `personnel-protection-thickness` -- Insulation Thickness for a Personnel-Protection Surface Temperature

```
surface temperature   from the heat balance through the insulation and the outer film
target                commonly 140 degF for brief contact on a jacketed surface;
                      lower for bare metal, which conducts heat into skin faster
jacket                a metal jacket runs hotter to touch than a mastic or PVC one at the
                      same temperature, because of its conductance to skin
film coefficient      the outer surface film governs the balance; still air is a poor
                      conductor and raises surface temperature
alternative           guarding or a personnel barrier where insulation is impractical
NOT the energy case   the thickness for a heat-loss or economic target is usually greater
```

The two design cases are independent and the personnel case is often the lighter one. Insulating a 400 degF
line to bring its surface to 140 degF takes less material than insulating it to an economic heat-loss target, so
a system insulated for energy already satisfies personnel protection -- but a line insulated ONLY for personnel
protection is not insulated for energy, and the reverse assumption is the one that gets made when someone
proposes stripping insulation from a line "that is only there for touch safety."

The jacket matters more than its thermal resistance suggests. Skin contact temperature depends on how fast the
surface can deliver heat into the skin, so a metal jacket at 140 degF feels much hotter and burns faster than a
mastic-coated surface at the same temperature. Standards recognize this by setting different acceptable surface
temperatures for different jacket materials, and specifying a thickness without specifying the jacket leaves the
criterion undefined.

The outer film coefficient is what makes the calculation sensitive to installation. A line in still air inside a
mechanical room has a lower film coefficient than one outdoors in wind, so it runs hotter at the surface for the
same insulation -- and a thickness calculated for outdoor conditions can be inadequate indoors, which is the
opposite of what intuition suggests.

**Inputs:** pipe size and surface temperature, ambient temperature and air movement, the insulation thermal conductivity at mean temperature, the jacket type and its surface emittance, and the target surface temperature

**Outputs:** the surface temperature at a stated insulation thickness, the thickness required for the target surface temperature, the thickness for a stated heat-loss target for comparison, which case governs, and the surface temperature at an alternative jacket or air movement condition

## 3. Worked example

A 4 in line at 400 degF in a 90 degF mechanical room, still air, aluminium jacket, target surface 140 degF.

The heat balance through the insulation and out through the surface film gives the thickness -- and the two
comparisons are what make the tile useful:

```
thickness for a 140 degF surface (personnel)  -> the lighter requirement
thickness for an economic heat loss target     -> typically greater
```

**A line insulated for energy already satisfies personnel protection.** The reverse does not hold, and that is
the practical point: a proposal to reduce insulation on a line "because it is only for touch protection" is
usually reducing insulation that was there for heat loss.

The jacket effect: at the same 140 degF surface, an aluminium jacket delivers heat into skin far faster than a
PVC or mastic finish, so standards permit a lower surface temperature on metal. Specifying "140 degF maximum
surface" without saying which jacket leaves the requirement ambiguous, and a metal-jacketed line meeting a
number set for mastic is not protected.

The counterintuitive installation effect: this line OUTDOORS in wind runs cooler at the surface than the same
line indoors in still air, because the outer film coefficient is higher. So a thickness taken from an outdoor
calculation and applied indoors can leave the surface hotter than the target -- the reverse of what most people
expect.

## 4. Scope and non-goals

A surface temperature calculation using conductivity and film coefficients the user supplies. Insulation
thermal conductivity is temperature dependent and must be evaluated at the mean temperature through the
insulation, which requires iteration; a room-temperature k value understates the heat flow on a hot line. Surface
film coefficients depend on orientation, air movement, and surface emittance and are approximations. Acceptable
surface temperatures for personnel protection are set by the applicable standard and by the employer's safety
program and differ by jacket material and expected contact duration -- there is no single number. It does not
address the energy or economic thickness (`economic-insulation-thickness`), condensation control on cold service,
freeze protection, or fire and smoke requirements for the insulation and jacket materials. It does not address
guarding as an alternative to insulation, which is often the better answer on valves and equipment. ASTM C1055
and C1057 for contact burn criteria, the insulation manufacturer's data, and the employer's safety program
govern.
