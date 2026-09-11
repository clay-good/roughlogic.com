# roughlogic.com Specification v1833 -- Berthing Energy and Fender Selection (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A fender absorbs the kinetic energy a vessel brings to the berth, and that energy goes as the square of approach speed. The speed is the assumption nobody measures and the one that decides the answer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive displacement or approach velocity, a coefficient outside its valid range, or a non-positive fender rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the berthing kinetic energy relation and its published coefficients with the applicable berthing design guidance and the fender manufacturer's performance data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`berthing energy fender`, `fender selection kinetic energy`, `approach velocity berthing`, `eccentricity factor berthing`, `virtual mass added mass berthing`.

## 2. The tile

### 2.1 `berthing-fender-energy` -- Berthing Energy and Fender Selection

```
kinetic energy   E = 0.5 M V^2, with M the vessel's mass (displacement / g) and V
                 the component of approach velocity NORMAL to the berth
virtual mass Cm  the water moving with the hull adds to the effective mass; 1.3 to
                 1.8 depending on under-keel clearance and approach
eccentricity Ce  the vessel rotates about the contact point rather than stopping
                 dead; 0.4 to 0.7 for a normal quarter-point berthing
softness Cs      the hull's own deflection absorbs a little; 0.9 to 1.0
configuration Cc a solid quay traps a water cushion; 0.8 to 1.0
design energy    E x Cm x Ce x Cs x Cc, compared against the fender's rated energy
                 absorption at its design deflection
the sensitivity  energy goes as V^2, so approach speed is the dominant assumption
                 and the least controlled quantity in the calculation
```

Everything in a fender calculation is reasonably knowable except the one term that is squared. Displacement
comes from the vessel's particulars; the coefficients come from published guidance and the berth's geometry;
approach velocity comes from an assumption about how the vessel will be handled, in what wind, with what tug
assistance, by which pilot, on a day nobody can specify in advance. Design guidance gives velocity bands by
vessel size and berthing condition, and the band is wide.

The squaring is what makes that uncertainty serious rather than merely annoying. A vessel arriving at twice
the design speed does not deliver twice the energy; it delivers four times, and a fender system sized to a
comfortable margin on speed has almost no margin on energy. This is why fender selection is conservative, why
berthing aid systems that measure and display approach speed are installed on high-value berths, and why the
larger the vessel the lower the permitted approach speed.

The eccentricity factor is the term that most reduces the answer and it is worth understanding rather than
just applying. A vessel almost never contacts a berth square and stationary along its whole length; it touches
at a quarter point and rotates, so only part of its kinetic energy goes into the fender and the rest remains
as rotation. A berthing that does come in square -- a barge pushed flat against a face, for instance -- has an
eccentricity factor near one, and the fender sees roughly twice the energy the usual assumption gives.

**Inputs:** the vessel displacement, the normal component of approach velocity, the virtual mass, eccentricity, softness, and berth configuration factors, and the fender's rated energy absorption

**Outputs:** the vessel mass, the kinetic energy, the design berthing energy after the factors, the margin against the fender rating, and the design energy at an alternative approach velocity

## 3. Worked example

A vessel of 22,000 tons displacement approaching at 0.5 ft/s normal to the berth:

```
mass   = 44,000,000 / 32.2 = 1,366,460 slugs
E      = 0.5 x 1,366,460 x 0.5^2 = 170,807 ft-lb
design = 170,807 x 1.5 x 0.5 x 1.0 x 0.95 = 121,700 ft-lb
```

**121,700 ft-lb against a fender rated 150,000 ft-lb** -- a margin of 23 percent, which looks comfortable.

**Now let the vessel arrive at 1.0 ft/s instead:**

```
design = 0.5 x 1,366,460 x 1.0^2 x 1.5 x 0.5 x 1.0 x 0.95 = 486,801 ft-lb
```

**4 times the energy from 2 times the speed, and 3.2 times the fender's rating.** The fender is
overwhelmed, and the load path beyond it is the quay structure -- **which is where a berthing accident becomes
a structural repair rather than a fender replacement.**

**That square is the whole reason fender design is conservative.** Every other term in the calculation is
knowable within a narrow band: displacement from the vessel's particulars, the coefficients from published
guidance and the berth's geometry. **Approach velocity is an assumption about seamanship on a day nobody can
specify**, and it is the term that is squared.

**The eccentricity factor is doing more work than it looks.** At Ce = 0.5 the fender sees 50% of the kinetic
energy, because the vessel rotates about the contact point instead of stopping dead. **A barge pushed square
onto a face has Ce near 1.0** and delivers 2 times as much energy -- so a berth that takes both ships and
flat-pushed barges has two very different design cases, and the barge one is easy to overlook.

## 4. Scope and non-goals

A screening calculation. Berthing energy analysis follows published guidance -- PIANC, the British Standard, and the US Army Corps and UFC criteria among them -- and they differ in the coefficients, in how approach velocity is selected, and in the abnormal berthing factor applied on top of the design energy, which no modern fender design omits. The coefficients here are representative ranges and the applicable guidance governs. Approach velocity must come from that guidance's tables by vessel size and berthing condition, adjusted for exposure, tug assistance, and whether berthing is aided; it is not a free assumption. It does not select a fender, which requires matching energy absorption against reaction force at the design deflection over the fender's published performance curve, corrected for temperature, angular compression, and velocity of compression, all of which change the curve materially. It does not check the reaction force against the quay structure, the panel, the chains, and the hull pressure limit, which is frequently what governs rather than energy. It does not address mooring loads (`mooring-load-wind-current`), berthing under wind and current, or abnormal impact. The applicable berthing design guidance, the fender manufacturer's performance data, and the marine structural engineer govern.
