# roughlogic.com Specification v1602 -- Pipe Bursting Upsize Displacement and Pull Load (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Bursting an old pipe and pulling a larger one into its place displaces soil, and the force needed depends on how much bigger the new pipe is. Upsizing more than the ground will take heaves the surface or moves the utility next to it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive existing or new pipe diameter, a new diameter at or below the existing, or a non-positive length or cover depth returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the displacement relation and upsize screening with the bursting system manufacturer and geotechnical investigation named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pipe bursting upsize`, `burst pull load`, `static pipe bursting force`, `soil displacement upsize`, `pipe bursting heave risk`.

## 2. The tile

### 2.1 `pipe-bursting-pull-load` -- Pipe Bursting Upsize Displacement and Pull Load

```
displacement      the annular volume the upsize forces into the surrounding soil
                  per foot = (pi/4)(d_new^2 - d_old^2)
pull load         expansion force at the head + frictional drag along the product pipe
                  both rise steeply with upsize ratio and with soil stiffness
upsize limit      one to two nominal sizes is routine; more needs analysis
ground movement   heave above the bore and lateral movement toward adjacent utilities
                  cover depth is the main control: shallow bursts heave
```

The soil has to go somewhere. Replacing a 6 inch pipe with an 8 inch one forces the difference in cross-section
outward into the surrounding ground, and in dense or shallow soil that displacement appears at the surface as
heave or sideways as movement of whatever else is buried nearby. That is why the upsize ratio, not the absolute
size, is the number that matters, and why depth of cover is the principal control on whether a burst is safe.

The pull load has two parts and both grow with upsize. The bursting head has to expand the ground, which takes a
force that rises sharply with the displaced area, and the new pipe then drags through the expanded hole. As with
HDD (`hdd-pullback-force`), the pipe's safe pull rather than the rig's rated pull is usually the governing limit
on HDPE.

The adjacent-utility question is the one that stops jobs. A gas service running parallel three feet away from a
burst can be displaced enough to fail, and that risk is assessed before the burst by locating everything nearby
and, where necessary, exposing it and monitoring during the pull -- not by the pull load calculation.

**Inputs:** existing pipe size and material, new pipe size and material, run length, depth of cover, soil type and density, the distance to the nearest parallel utility, and the product pipe safe pull

**Outputs:** the displaced volume per foot and for the run, the upsize ratio, an indicative pull load, the margin against the product pipe safe pull, the depth-to-displacement ratio as a heave screen, and a flag where an adjacent utility falls inside the influence zone

## 3. Worked example

Bursting a 6 in clay sewer and pulling in 8 in HDPE, 300 ft long, at 7 ft of cover:

```
displaced area = (pi/4)(8^2 - 6^2) = (pi/4)(64 - 36) = 22.0 sq in = 0.153 sq ft
displaced volume over the run = 0.153 x 300 = 45.9 cu ft = 1.70 cu yd
upsize ratio = 8 / 6 = 1.33
```

Under two cubic yards of soil pushed outward along 300 feet. At 7 ft of cover in ordinary soil that dissipates;
at 3 ft of cover under a street it will show at the surface.

The screen worth carrying: the ratio of cover depth to the radial expansion. Here the pipe radius grows by 1 in,
and there are 84 in of cover -- a ratio of 84, which is comfortable. Bursting the same pipe to 12 in grows the
radius by 3 in for a ratio of 28, and at 3 ft of cover it would be 12, which is where heave becomes likely.

Adjacent utilities: a gas service running parallel at 3 ft is well inside the zone that a 1.33 upsize disturbs in
dense soil. It gets located, exposed at intervals, and monitored -- or the burst does not happen and the line is
open-cut or slip-lined at the smaller size instead.

## 4. Scope and non-goals

A displacement and screening calculation. It does not compute the bursting force from soil mechanics, which
depends on the existing pipe material and how it fragments, the soil's strength and stiffness, and the head
geometry; manufacturers and specialist contractors have empirical data for their systems that governs. It does
not predict ground movement quantitatively -- heave and lateral displacement prediction requires a cavity
expansion analysis with site-specific parameters, and where sensitive structures or utilities are nearby that
analysis, plus monitoring, is what protects them. It does not evaluate whether the existing pipe is burstable:
ductile iron, steel, repaired sections, concrete encasement, and point repairs can stop a burst or deflect it,
and a CCTV survey is what establishes that. It does not address service reconnections, which are the bulk of the
work on a sewer burst. The geotechnical investigation, the bursting system manufacturer, the pipe manufacturer's
safe pull, and the utility owner govern.
