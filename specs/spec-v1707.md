# roughlogic.com Specification v1707 -- Injection Molding Cooling Time From Wall Thickness (`calc-process.js`, Group G Cross-Trade Utilities, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Cooling is most of an injection cycle, and it goes as the SQUARE of wall thickness -- so a part 25 percent thicker takes over half again as long to cool. It is the single most consequential geometry decision for cycle time and part cost.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wall thickness or thermal diffusivity, or an ejection temperature at or below the mould temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the plate cooling relation and the square dependence on wall thickness with the material supplier data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`injection cooling time wall thickness`, `cooling time square law plastic`, `cycle time thick section`, `thermal diffusivity cooling plastic`, `coring out thick sections`.

## 2. The tile

### 2.1 `injection-cooling-time` -- Injection Molding Cooling Time From Wall Thickness

```
cooling time      t proportional to wall thickness squared / thermal diffusivity
plate form        t = (h^2 / (pi^2 alpha)) x ln( (4/pi) x (T_melt - T_mould) / (T_eject - T_mould) )
alpha             thermal diffusivity; for most thermoplastics roughly 0.0005 to
                  0.001 sq in per second
square law        doubling wall thickness quadruples cooling time
consequence       cycle time, and therefore part cost, is dominated by the thickest section
design            uniform, thin walls with coring rather than thick sections
```

The square law is the reason plastic parts are designed the way they are. Cooling time depends on how long heat
takes to diffuse out of the thickest section, and diffusion time scales with the square of the distance -- so
every design decision that adds wall thickness is paid for on every part for the life of the tool. A boss or a
rib that is thicker than the nominal wall does not just risk a sink mark; it sets the cycle.

That is why coring out thick sections is such a strong move. Replacing a solid 0.200 in section with two 0.100 in
walls and a core does not halve the cooling time -- it quarters it, and the part cost follows.

Mould temperature enters through the logarithm rather than the square, so it is a weaker lever than thickness but
a real one and it is adjustable after the tool is built. Running the mould colder shortens cooling and costs part
quality: less crystallinity in semi-crystalline materials, more moulded-in stress, and worse surface finish. That
trade is made in the process rather than in the design.

Ejection temperature is the other input and it is a material property tied to the part's stiffness at
temperature -- a part ejected too hot distorts, and a part cooled to be safely ejectable has spent the cycle
getting there.

**Inputs:** the maximum wall thickness, the material thermal diffusivity, the melt, mould, and ejection temperatures, and the part geometry (plate or cylinder)

**Outputs:** the cooling time for the entered thickness, the cooling time for an alternative thickness to show the square law, the sensitivity to mould temperature, the total cycle estimate, and the cost per part impact of a stated thickness change

## 3. Worked example

A part with a 0.1 in nominal wall, thermal diffusivity 0.0006 sq in per second:

```
t_cool proportional to h^2 / alpha
      = 0.1^2 / 0.0006 = 16.7 (x the logarithmic temperature term)
```

Now increase the wall to 0.125 in -- a 25 percent increase that a designer might make for stiffness:

```
ratio = (0.125 / 0.1)^2 = 1.562
```

**56 percent longer cooling** for a 25 percent thicker wall. If the cooling was 12 seconds
it is now 18.8, and on a part running a million a year that is
1,875 machine-hours a year -- a large number, and it is paid every cycle forever.

**Coring is the counter-move.** A solid 0.200 in section cooled as a plate takes

```
(0.200 / 0.1)^2 = 4 times
```

4 times as long as the 0.1 in wall. Core it into two 0.1 in walls and the cooling returns to the
baseline -- a 75 percent reduction in the cooling portion of the cycle from a geometry
change that costs nothing per part.

Mould temperature is the weaker lever, entering through the logarithm: running colder shortens the cycle and
costs crystallinity, adds moulded-in stress, and degrades surface finish. It is the adjustment available after
the tool exists; thickness is the one available before.

## 4. Scope and non-goals

A one-dimensional conduction estimate treating the part as a plate. Real parts are three-dimensional and cool
faster than a plate calculation suggests where they are thin in more than one direction, and slower where cooling
lines cannot reach. Thermal diffusivity varies between materials and with temperature, and for semi-crystalline
materials the heat of crystallization adds to the load in a way this simple form does not capture. It does not
model the mould's cooling circuit, which determines whether the mould surface actually holds the assumed
temperature -- inadequate or poorly placed cooling lines make the calculated time unachievable, and cooling
analysis is what resolves it. It does not address ejection temperature, which depends on the part's stiffness and
the ejection system, or the warpage that non-uniform cooling causes. The material supplier's processing data,
mould flow and cooling analysis, and the mould designer govern.
