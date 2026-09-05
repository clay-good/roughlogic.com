# roughlogic.com Specification v1733 -- Arc-Rated Clothing ATPV Selection From Incident Energy (`calc-cross.js`, Group G Cross-Trade Utilities, industrial hygiene, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; industrial hygiene and safety), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Arc-rated clothing is selected so its rating exceeds the incident energy the worker could be exposed to, and the rating is a specific tested number rather than a category of fabric. The catalog computes incident energy; this is the step that turns it into what someone wears.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive incident energy or arc rating, or an arc rating below the incident energy returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 70E arc rating selection and ASTM F1506 by name, with IEEE 1584 named for the incident energy study, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`arc rated clothing selection`, `atpv incident energy`, `arc flash ppe rating`, `ebt breakopen threshold`, `nfpa 70e ppe category`.

## 2. The tile

### 2.1 `arc-rated-clothing-selection` -- Arc-Rated Clothing ATPV Selection From Incident Energy

```
incident energy    cal/sq cm at the working distance (`arc-flash-screen`)
ATPV               arc thermal performance value: the incident energy at which there is
                   a 50% probability of second-degree burn through the fabric
EBT                breakopen threshold energy, reported instead of ATPV for some fabrics
                   the LOWER of the two is the fabric's arc rating
selection          the arc rating must be at or above the incident energy
layering           layers add; the system rating is tested, not the sum of the components
underlayers        meltable synthetics under arc-rated clothing are prohibited; they melt
                   to the skin
PPE category       an alternative table-based method in NFPA 70E for defined tasks
what it does not   arc-rated clothing prevents burns from the arc; it does not prevent
                   blast injury, hearing damage, or electrocution
```

The rating is a probability statement rather than a guarantee and it is worth stating plainly: ATPV is the
incident energy at which there is a fifty percent chance of a second-degree burn through the fabric. Clothing
rated exactly at the incident energy is at that fifty percent point, which is why selection with margin is
ordinary practice rather than excessive caution.

Layering is not additive arithmetic. Two garments each rated 8 cal/sq cm do not make a 16 cal system -- the
system rating comes from testing the combination, and it is usually higher than either alone but not by a
predictable amount. Air gaps between layers contribute, which is why a tested system rating is the number to use
and why substituting a different underlayer changes the system.

The underlayer prohibition is absolute and it is the detail that causes injuries. Meltable synthetics --
polyester, nylon, acetate -- worn under arc-rated clothing melt and adhere to skin in an arc event, producing
injuries far worse than the arc alone would. Natural fibres or arc-rated underlayers only, and it applies to
everything: undershirts, socks, and anything else in contact with skin.

And the boundary of what the clothing does. Arc-rated clothing addresses the thermal hazard. The pressure wave,
the acoustic energy, the molten metal, and the shock hazard are separate, and each has its own protection --
which is why arc flash PPE is a system including face and hearing protection, gloves, and the shock protection
that keeps the worker from contact in the first place.

**Inputs:** the incident energy at the working distance, the arc rating of each garment and of the tested system, the layering arrangement, the underlayer materials, and the task and equipment for the alternative category method

**Outputs:** the incident energy against the entered system arc rating, the margin, a pass or fail, the minimum arc rating required, a flag where meltable underlayers are indicated, and the additional PPE elements the incident energy level requires beyond clothing

## 3. Worked example

An incident energy of 8 cal/sq cm at the working distance, from `arc-flash-screen`.

```
required arc rating >= 8 cal/sq cm
```

A garment system tested at 12 cal/sq cm provides 4 cal of margin -- and that margin matters, because
**ATPV is the energy at a 50 percent probability of a second-degree burn**. Clothing rated exactly at the
exposure sits at that fifty percent point, which is not where anyone wants to be.

**Layering is not addition.** Two 8 cal garments do not make a 16 cal system; the system rating comes from
testing the combination, and air gaps between layers contribute in a way arithmetic does not predict. Use the
tested system rating, and understand that substituting a different underlayer changes the system that was tested.

**The underlayer prohibition.** Polyester, nylon, and acetate next to skin melt in an arc event and adhere to
the skin, producing injuries worse than the arc alone. Natural fibre or arc-rated underlayers only -- and that
includes the undershirt and the socks, which is where it gets forgotten.

**And what 8 cal/sq cm of clothing does not do.** It addresses the thermal hazard. The pressure wave, the
noise, the molten metal spray, and the shock hazard are separate, and the complete PPE for this exposure includes
face protection, hearing protection, arc-rated gloves or leather over rubber insulating gloves, and the shock
protection that prevents contact in the first place. The clothing is one element of a system.

The best answer remains the one that removes the exposure: de-energize and establish an electrically safe work
condition, and treat energized work as the exception requiring justification.

## 4. Scope and non-goals

A comparison against arc ratings the user supplies. Arc ratings are tested values for specific garments and
garment systems to ASTM F1506 and the related test methods, and a system's rating comes from testing the
combination rather than from adding component ratings. It does not calculate incident energy, which is
`arc-flash-screen` for a screening estimate and which for any real application requires an arc flash study to
IEEE 1584 with accurate system data, protective device settings, and working distances -- an incident energy
number is only as good as the study behind it. It does not address the arc flash boundary, the shock approach
boundaries (`shock-approach-boundary`), or the energized electrical work permit, risk assessment, and
justification that NFPA 70E requires before energized work is performed at all. Arc flash injuries are severe and
often fatal: NFPA 70E, IEEE 1584, the arc flash study for the specific equipment, and a qualified person
govern.
