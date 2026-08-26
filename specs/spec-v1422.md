# roughlogic.com Specification v1422 -- Current-Limiting Let-Through and Downstream Withstand (calc-elecdesign.js, Group A, electrical power systems, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, electrical power systems), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes a conductor's short-circuit thermal withstand but never compares it against what an upstream current-limiting device actually lets through. That comparison is the entire justification for protecting a conductor or a piece of equipment whose own rating is below the available fault current -- and it is also where the series-rating rule, which is not a calculation at all, has to be stated plainly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive let-through current, let-through I^2t, withstand rating, or clearing time, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the current-limiting device let-through (peak Ip and I^2t) convention published on manufacturer let-through curves, the Onderdonk conductor withstand relation, and NEC 110.9, 110.10, and 240.86 for interrupting and series ratings, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `fuse-let-through` -- Current-Limiting Let-Through and Downstream Withstand

```
conductor withstand I = 0.0297 x circular mils x sqrt(log10((T2+234)/(T1+234)) / t)
conductor withstand I^2t = I^2 x t
margin = conductor withstand I^2t / device let-through I^2t
peak stress check: device peak let-through Ip vs equipment peak withstand
```

A current-limiting fuse or breaker opens inside the first quarter cycle, before the fault current reaches its
prospective peak. What it lets through is characterized two ways on the manufacturer's curve: **peak let-through
current**, which drives the magnetic forces that bend busbars and rip apart terminations, and **let-through
I-squared-t**, which drives the heating that damages insulation. Downstream conductors and equipment have to
survive both.

The margin is usually enormous, and that is the point -- a current-limiting device converts an unprotectable
conductor into a protected one, and the arithmetic shows by how much. What it does **not** do is let a downstream
device be applied above its own interrupting rating. That is a **series rating**, and a series rating exists only
as a *tested combination* published by the manufacturer and marked on the equipment. It cannot be calculated, it
cannot be inferred from a let-through curve, and NEC 240.86 requires the specific combination be listed. The tile
says so and refuses to imply otherwise.

**Inputs:** device let-through peak current and I-squared-t at the available fault current, conductor size in
circular mils, insulation initial and damage temperatures, fault duration, downstream equipment short-circuit
withstand.

**Outputs:** conductor withstand current and I-squared-t, margin against the let-through, peak stress comparison,
and a plain statement of the series-rating rule.

## 3. Worked example

A 4 AWG copper conductor (41,740 circular mils), 75 C initial, 250 C damage limit for thermoplastic insulation,
against a current-limiting fuse whose curve shows 25,000 A2s of let-through at the available fault current, taken
over a 0.01 s (half-cycle) basis:

```
withstand I    = 0.0297 x 41,740 x sqrt(log10(484/309) / 0.01) = 5,473 A
withstand I^2t = 5,473^2 x 0.01                                 = 299,502 A2s
margin         = 299,502 / 25,000                               = 12.0 x
```

Twelve to one -- the conductor is protected with an order of magnitude to spare, which is what current limitation
buys. Without the fuse, that same conductor facing an unrestricted 25 kA fault for even a half cycle would see
`25,000^2 x 0.01 = 6,250,000 A2s`, twenty-one times its withstand, and the insulation would be destroyed whether
or not the breaker eventually opened.

None of that permits a 10 kA breaker downstream of a 25 kA available fault. That is a series rating and it
requires a tested, listed, and marked combination.

## 4. Scope and non-goals

Let-through values come from the manufacturer's published curve for the specific device *at the specific
available fault current* and are meaningless read off any other curve; the tile does not compute them. The
Onderdonk relation gives the conductor's thermal limit only and says nothing about the mechanical forces on the
conductor and its supports, which the peak let-through drives and which this tile only flags. It does not evaluate
equipment short-circuit ratings, bus bracing, or the SCCR of an assembly, all of which are separate and all of
which are marked, not calculated. **A series rating is never a calculation.** NEC as adopted, the device and
equipment manufacturers' listings, and the AHJ govern.
