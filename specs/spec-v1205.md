# roughlogic.com Specification v1205 -- Composite Curve Number for Impervious Area (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-07). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1204.md.
>
> **The gap, and the evidence for it.** The `curve-number-runoff` (spec-v1201), `tr55-graphical-peak-discharge`
> (spec-v1203), and `tr55-detention-storage` (spec-v1204) tiles all start from a single curve number, but a real
> developed watershed is a mix of pervious ground and impervious cover, and reading one CN from a table gets it wrong.
> The NRCS TR-55 Chapter 2 composite CN (figures 2-3 and 2-4) is the standard for that and had no tile. It completes the
> workflow at the front: composite CN -> runoff depth -> peak discharge -> detention storage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a pervious CN outside (0, 100], an impervious percentage outside [0, 100], an
unknown connection mode, or an unconnected ratio outside [0, 1] returns `{ error }`. Citation discipline (v19/v22):
NRCS TR-55 (1986) Chapter 2 figures 2-3/2-4 by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** --
the composite-CN equations are public, and the pervious CN itself (TR-55 Table 2-2, land cover x hydrologic soil group)
is the user's own input.

## 2. The tile

### 2.1 `composite-curve-number` -- Composite Curve Number (Impervious Area)

```
Connected (figure 2-3):    CNc = CNp + (Pimp/100)(98 - CNp)
Unconnected (figure 2-4):  CNc = CNp + (Pimp/100)(98 - CNp)(1 - 0.5 R)      only for total impervious under 30%
```

**Inputs:** pervious curve number `pervious_cn`, impervious percentage `impervious_pct`, connection mode `connection`
(connected / unconnected), and the unconnected fraction `unconnected_ratio` R (used only for the unconnected mode).

**Outputs:** the composite CN `composite_cn`, the lift `impervious_add` over the pervious CN, and a flag when the
unconnected figure-2-4 method is applied at 30% or more impervious (where TR-55 says to treat the area as connected).

## 3. Worked example (TR-55 example 2-4)

`pervious_cn = 74, impervious_pct = 25, connection = unconnected, unconnected_ratio = 0.5`:

```
CNc = 74 + (25/100)(98 - 74)(1 - 0.5 x 0.5) = 74 + 0.25 x 24 x 0.75 = 78.5
```

The same 25% impervious fully connected (figure 2-3) gives `74 + 0.25 x 24 = 80.0` -- the runoff penalty for piping the
impervious area straight to the storm system instead of disconnecting it onto pervious ground.

## 4. Limitations

Figure 2-4 (unconnected) applies only when the total impervious area is under 30 percent; above that, treat the
impervious as connected. The composite CN is an area/connectivity blend, not a substitute for a sub-area analysis where
land uses differ widely. A design aid; the local drainage manual and the engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1205` pins examples 2-3/2-4, the R=0 (equals connected) and R=1 identities, the CN<=98
  ceiling, the 30%-impervious flag, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (example 2-4 and the connected cross-check).
- Equations transcribed from and checked against the public-domain TR-55 (1986) Chapter 2 (figures 2-3, 2-4).
