# roughlogic.com Specification v1881 -- Disinfection Contact Time from a Baffling Factor (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** `disinfection-ct` takes the contact time T as an input and never derives it. The derivation is where temporary systems go wrong: a tank's volume divided by the flow is not its contact time, and an unbaffled bladder delivers a tenth of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume or peak flow returns `{ error }`; a baffling factor outside 0.1-1.0 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): EPA 815-R-20-003, *Disinfection Profiling and Benchmarking Technical Guidance Manual* (June 2020), Section 4.4 and Table 4-2, named as the method, the primacy agency's tracer-study or baffling-factor determination named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`baffling factor`, `contact time t10`, `chlorine contact tank time`, `temporary tank contact time`, `detention time baffling`.

## 2. The tile

### 2.1 `contact-time-baffling` -- Disinfection Contact Time from a Baffling Factor

```
volume        V at the MINIMUM operating level, not the nominal capacity
TDT           theoretical detention time = V / Q_peak (min)
T (t10)       T = TDT x BF        (EPA Eq. 4-3)
BF            unbaffled (mixed flow)                0.1
              poor (single inlet/outlet, no baffles) 0.3
              average (some intra-basin baffles)    0.5
              superior (serpentine baffling)        0.7
              perfect (plug flow, pipeline)         1.0   (EPA Table 4-2)
CT            C (mg/L residual at the outlet) x T -> hand to disinfection-ct
```

Contact time is the time by which only 10% of the water has passed through, and a tank reaches it far sooner than
its volume suggests. Water entering an unbaffled tank short-circuits straight to the outlet, so the first tenth of it
leaves long before the tank has turned over once. The EPA's baffling factor turns the easy number -- volume over flow --
into the defensible one, and the factor for an unbaffled tank is 0.1, a tenfold difference that decides whether a
temporary system meets its CT requirement at all.

Emergency systems are where this matters most, because they are built from what is available. A pillow bladder, a
frac tank, or a poly tote piped with one inlet and one outlet is an unbaffled or poorly baffled vessel, and a
designer who divides its volume by the pump rate overstates the contact time by three to ten times. A length of
pipeline, by contrast, is close to plug flow and earns a factor of 1.0 -- so a long transmission run after the chlorine
injection point is often worth more contact time than a large tank.

The volume is the minimum operating level, and the flow is the peak hourly flow. Both are the conservative case the
guidance requires: a tank drawn down during peak demand has the least water in it at exactly the moment the most
water is leaving. A contact time computed at full tank and average flow is the best case, not the design case.

**Inputs:** the vessel volume at minimum operating level (or its dimensions), the peak hourly flow, the baffling condition, and optionally the outlet free-chlorine residual

**Outputs:** the theoretical detention time, the contact time T at the chosen baffling factor, the same T at the other factors for comparison, and the CT when a residual is entered

## 3. Worked example

**The EPA's own example (Example 4-1):** a 40 ft diameter clearwell at a 30 ft minimum depth, peak flow 347 gpm,
unbaffled:

```
V   = pi/4 x 40^2 x 30 x 7.4805 = 282,009 gal
TDT = 282,009 / 347 = 812.7 min
T   = 812.7 x 0.1 = 81.3 min
```

**81.3 minutes, matching the manual** -- against 813 minutes for the naive volume-over-flow figure.

**A temporary system:** a 20,000 gal pillow bladder with one inlet and one outlet, fed at 50 gpm, 1.0 mg/L free
chlorine at the outlet:

```
TDT = 20,000 / 50 = 400 min
T   = 400 x 0.3 (poor) = 120 min      CT = 1.0 x 120 = 120 mg-min/L
    = 400 x 0.1 (if it behaves as fully mixed) = 40 min   CT = 40
```

**The same bladder is 120 minutes of contact time if it is merely poor, and 40 if it mixes completely** -- a factor
of three decided by how the inlet and outlet are arranged, not by the size of the bag. Placing the inlet and
outlet at opposite ends, or following the bladder with a length of pipe, is what moves it toward the better number.

## 4. Scope and non-goals

A contact time estimate from EPA's published baffling factors. The factor is a judgment of the vessel's hydraulics, and a tracer study supersedes it; the primacy agency may require one or may assign a factor itself. It does not compute the required CT for a given log inactivation, pH, and temperature (`disinfection-ct`), the chlorine demand or dose (`chlorine-demand`), or the decay of the residual across the vessel (`chlorine-decay`). It treats the residual as the outlet value, as the guidance requires. It does not design baffles. EPA 815-R-20-003, the primacy agency, and the operator of record govern.
