# roughlogic.com Specification v1280 -- Orifice Permanent Pressure Loss (calc-velocity.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-velocity.js`**
> (Group C, flow/velocity), no new module or dependency. Inherits spec.md through spec-v1279.md.
>
> **The gap (the sibling names it).** `dp-flow-meter` (spec-v1267) and `gas-dp-flow-meter` (spec-v1274) compute
> the *flow* from the differential pressure but not the *permanent pressure loss*; the dp-flow-meter note only
> remarks that "a venturi ... recovers most of the pressure." The unrecovered loss is what the pump or fan must
> actually make up, and nothing computed it. This adds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive pipe ID / bore / dP, a bore not smaller than the pipe, or a Cd outside (0, 1] returns `{ error }`;
no numeric field is ever `Infinity`. Citation discipline (v19/v22): ISO 5167-1/2 permanent pressure loss, by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `orifice-pressure-loss` -- Orifice Permanent (Unrecovered) Pressure Loss (ISO 5167)

```
beta = d / D
dW/dP = (sqrt(1 - beta^4 (1 - Cd^2)) - Cd beta^2) / (sqrt(1 - beta^4 (1 - Cd^2)) + Cd beta^2)
permanent loss = (dW/dP) x dP        recovered = dP - permanent loss
```

The differential pressure measured across the taps is mostly recovered downstream as the jet re-expands; only the
fraction `dW/dP` stays permanently lost. A smaller bore (lower beta) meters a wider flow range but wastes more
pressure -- the central trade in sizing an orifice.

**Inputs:** pipe inside diameter D (in), bore diameter d (in), differential pressure dP (psi), orifice discharge
coefficient Cd (default 0.61).

**Outputs:** the permanent loss (psi and in w.c.), the loss fraction of dP, the recovered pressure, and beta.

## 3. Worked example

2 in orifice in a 4 in line (beta 0.5), 1 psi differential, Cd 0.61:

```
dW/dP = (sqrt(1 - 0.0625(1 - 0.3721)) - 0.61 x 0.25) / (sqrt(...) + 0.61 x 0.25)
      = (0.98018 - 0.1525) / (0.98018 + 0.1525) = 0.7307
permanent loss = 0.731 psi (20.2 in w.c.); 0.269 psi (27%) is recovered
```

Cross-check: shrink the bore to 1.2 in (beta 0.3) and the loss climbs to 90% of the differential; open it to 2.8 in
(beta 0.7) and it drops to 51%. So the same meter that reads a wide flow range on a small bore throws away the most
pump head, which is the reason orifice sizing is a compromise.

## 4. Scope and non-goals

The square-edge orifice permanent pressure loss per ISO 5167-1/2. A classical venturi recovers most of the
differential (its loss, roughly 10-20% of dP, comes from the divergent cone and is a separate calculation), and a
flow nozzle sits between the two. The flow itself is `dp-flow-meter` (liquid) or `gas-dp-flow-meter` (gas). A sizing
estimate; the manufacturer's or ISO 5167 loss data governs.
