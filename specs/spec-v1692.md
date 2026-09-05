# roughlogic.com Specification v1692 -- Lead Dust Clearance Loading and Wipe Count (`calc-demo.js`, Group D Water Damage and Mold Restoration, abatement, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-demo.js`**
> (Group D, Water Damage and Mold Restoration -- the existing category, hub `/groups/restoration/`; abatement and demolition), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Lead clearance is a dust-wipe measurement against a loading limit, and the limits are in micrograms per square foot -- quantities invisible on a surface that looks clean. Passing clearance is a laboratory result, not a judgment, and the number of wipes is set by the rooms rather than by the area.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wipe area or laboratory result, or a sample count below the protocol minimum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the dust-lead clearance loading criteria with the applicable EPA and HUD standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lead dust clearance wipe`, `lead loading micrograms per square foot`, `clearance testing lead`, `window trough lead dust`, `rrp clearance sampling`.

## 2. The tile

### 2.1 `lead-dust-clearance` -- Lead Dust Clearance Loading and Wipe Count

```
dust loading      micrograms of lead per square foot of wiped area
limits            set by EPA and HUD; floors, interior window sills, and window troughs
                  each have their own limit, and the limits have been tightened over time
wipe area         a measured area, commonly one square foot, marked with a template
sample count      by room and by surface type, per the applicable protocol
composite         some protocols permit compositing; others require single-surface samples
laboratory        analysed by an accredited laboratory; field screening is not clearance
consequence       a failed clearance means re-cleaning and re-testing the affected area
```

The limits are small enough that surfaces which look and feel clean routinely fail. Lead dust is fine, it
settles into surface texture and into the corners of window troughs, and normal cleaning does not remove it --
which is why the protocol specifies HEPA vacuuming, wet washing, and HEPA vacuuming again rather than cleaning as
a general activity. A crew that cleans well by ordinary standards and tests fails.

Window troughs are the surface that fails most often and the one most often skipped. They collect the dust from
the friction surfaces above them, they are awkward to reach, and they have their own limit -- so a job that
passes on floors and sills and was not cleaned in the troughs fails on the troughs and the whole area needs
re-cleaning and re-testing.

The measured wipe area is what makes the result a loading rather than a quantity. A wipe over a larger area than
the template dilutes the result; a wipe over a smaller one concentrates it. Both are procedural errors that
produce a number the laboratory reports faithfully and that does not mean what it says, which is why the
template and the recorded area are part of the sample.

Clearance is performed by an independent certified professional, not by the abatement contractor, precisely
because it is the check on the contractor's own work.

**Inputs:** the surfaces sampled and their areas, the laboratory result for each wipe, the applicable clearance limits for floors, sills, and troughs, the number of rooms and the required sample count, and the protocol in use

**Outputs:** the dust loading for each wipe from the laboratory result and the wiped area, each against its surface limit, a pass or fail per sample and overall, the failing surfaces named, and the sample count required for the entered room count

## 3. Worked example

A clearance on a three-room renovation:

```
floor, room 1      laboratory reports 6 micrograms over a 1 sq ft wipe -> 6 ug/sq ft
sill, room 1       38 ug over 1 sq ft                                   -> 38 ug/sq ft
trough, room 1     280 ug over 1 sq ft                                  -> 280 ug/sq ft
```

Each is compared against its own surface limit from the applicable standard -- floors, sills, and troughs have
different limits and the trough limit is the highest of the three, which is why a trough result that looks alarming
next to a floor result may still pass while a much smaller floor result fails.

**The trough is where jobs fail.** It collects everything abraded from the window above it, it is awkward to
reach, and a crew that cleaned the visible surfaces well and gave the trough a wipe will not have removed dust at
these quantities. A failed trough means re-cleaning and re-testing that room.

**The wipe area is part of the measurement.** The laboratory reports micrograms; the loading is micrograms over
the AREA WIPED. A technician who wipes a 2 sq ft area and records it as 1 sq ft halves the reported loading and
passes a surface that failed -- and the laboratory result is entirely correct.

And clearance is performed by an independent certified professional. A contractor testing their own work is not
clearance, whatever the numbers say.

## 4. Scope and non-goals

A comparison against clearance limits the user supplies. The applicable dust-lead clearance levels are set by
EPA and HUD, they differ by surface type, and they have been revised downward over time -- the currently
applicable values for the jurisdiction and the program govern, and using an outdated limit passes work that
should fail. The sampling protocol, the number and location of samples, compositing rules, and the qualifications
required of the person performing clearance are set by the applicable regulation and program. It does not perform
or interpret sampling, and field screening methods are not clearance. It does not address soil or paint-chip
sampling, risk assessment, or the abatement and interim control methods themselves. It does not address the
occupant protection, notification, and recordkeeping obligations. Lead exposure causes permanent
neurodevelopmental harm in children: the applicable EPA and HUD regulations, the state program, and the certified
professional performing clearance govern.
