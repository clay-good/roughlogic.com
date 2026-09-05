# roughlogic.com Specification v1600 -- Electromagnetic Locate Depth and Signal Offset (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An electromagnetic locator reports a depth, and that depth is right only when the signal is clean. Distortion, coupling onto other utilities, and the operator's own technique all bias it -- and the checks that catch a bad reading are geometric ones a locator technician can do in a minute.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive measured offset or depth, or asymmetric nulls beyond the entered distortion tolerance returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the geometric depth-check methods with the state one-call statute and damage-prevention requirements named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`locate depth check`, `electromagnetic locator accuracy`, `45 degree depth method`, `locate signal distortion`, `utility locate triangulation`.

## 2. The tile

### 2.1 `locate-depth-offset` -- Electromagnetic Locate Depth and Signal Offset

```
peak and null    the response peaks over the line and nulls to either side
depth by 45-deg   move sideways to where the signal halves; that offset equals the depth
triangulation     an independent depth check that does not trust the instrument's own readout
distortion check  the two nulls should be symmetric about the peak; asymmetry means distortion
current measure   a signal current reading falling along the line indicates coupling or bleed-off
depth error       distortion typically reads the line SHALLOWER than it is
```

The instrument's depth readout is a computation from field strength, and it assumes a single isolated
conductor. Put a second utility nearby, a rebar mat overhead, or a poorly grounded signal return in the picture
and the field is no longer that of an isolated line, so the computed depth is wrong -- usually shallow, which is
the dangerous direction because it makes an excavator believe there is more cover than there is.

The 45-degree check is the discipline that catches it. Move perpendicular to the line until the signal drops by
half; the horizontal distance moved equals the depth, independently of the instrument's own depth calculation. If
the two agree, both are probably right. If they disagree, the field is distorted and the locate should not be
trusted at any depth.

Signal current is the other diagnostic. A locator that reads current should show it decreasing gradually along
the line; a sharp drop means the signal has left the target and coupled onto something else, and everything
located beyond that point may be a different utility entirely. That is how a crew ends up potholing confidently
in the wrong place.

None of this replaces exposing the utility (`vacuum-excavation-spoil`), which is what actually establishes
position and depth.

**Inputs:** the instrument depth reading, the horizontal offset at which the signal halves, the two null offsets from the peak, the signal current at two points along the line, and the frequency in use

**Outputs:** the depth from the 45-degree geometric method, the instrument reading against it with the difference, the null symmetry check, the signal current change along the line, and a confidence flag with the likely cause when the checks disagree

## 3. Worked example

A locate reporting 52 in of depth. The technician runs the checks:

```
instrument depth readout        = 52 in
45-degree method: signal halves at 71 in horizontal offset -> depth = 71 in
difference                      = 19 in, 37% disagreement
left null  at 34 in from peak
right null at 58 in from peak   -> asymmetric by 24 in
```

**The checks disagree and the nulls are asymmetric**, so the field is distorted and the 52 in readout is not
trustworthy -- and it is shallow, which is the direction that gets a line hit. The likely causes are a second
conductor nearby, a bonded metallic structure, or a signal return path that is not where it is assumed to be.

The response is not to average the two numbers. It is to change frequency, re-apply the signal at a different
point, try a direct connection instead of induction, and re-run both checks -- and if the field will not clean
up, to mark a wider tolerance zone and expose the line before anyone digs.

Signal current falling from 480 mA at the connection point to 90 mA two hundred feet down the line says the
signal has largely left the target. Anything located past that point is suspect.

## 4. Scope and non-goals

A set of geometric consistency checks on an electromagnetic locate. It does not perform the locate, and it
cannot detect a utility that is not conductive, not energized with a locate signal, or not present in the records
-- non-metallic pipe without a tracer wire, abandoned lines, and unrecorded facilities are located by other means
or not at all. Depth readings are approximate under the best conditions and are not a substitute for exposing the
facility; the tolerance zone required by one-call law and the requirement to expose by hand or vacuum excavation
before mechanical digging apply regardless of any depth reading. It does not address the one-call notification
process, marking standards and colour codes, or the documentation and response obligations, all of which are
statutory. Damaging a utility is a safety and legal matter: the state one-call statute, the facility owner, and
the applicable damage-prevention standard govern.
