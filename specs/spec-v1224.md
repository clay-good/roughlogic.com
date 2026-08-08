# roughlogic.com Specification v1224 -- Eyring Reverberation Time (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N),
> no new module, group, or dependency. Inherits spec.md through spec-v1223.md.
>
> **The gap.** Family-completion: the room-acoustics family computes RT60 by Sabine only (`room-acoustics`,
> `room-absorption-target`); the Eyring-Norris form -- the standard companion for high-absorption rooms where Sabine
> over-predicts -- was missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive volume or surface area, an average absorption outside (0, 1), or a
non-positive coefficient returns `{ error }`. Citation discipline (v19/v22): the Eyring-Norris equation (Eyring, J.
Acoust. Soc. Am., 1930), by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- public-domain
acoustics; the absorption and surface area are the user's room take-off.

## 2. The tile

### 2.1 `eyring-reverberation` -- Eyring Reverberation Time (RT60, High Absorption)

```
a_bar        = total_sabins / S                         average absorption coefficient
RT60_eyring  = 0.049 V / (-S ln(1 - a_bar))
RT60_sabine  = 0.049 V / (S a_bar)                      shown for comparison
```

**Inputs:** room volume V (ft^3), total surface area S (ft^2), average absorption coefficient a_bar (0-1), and the
editable Sabine coefficient (default 0.049).

**Outputs:** RT60 by Eyring and by Sabine, and the total absorption in sabins.

## 3. Worked example

`volume_ft3 = 5000, surface_area_ft2 = 1300, avg_absorption = 0.30`:

```
A = 1300 x 0.30 = 390 sabins
Eyring = 0.049 x 5000 / (-1300 ln 0.70) = 245 / 463.68 = 0.53 s
Sabine = 245 / 390 = 0.63 s
```

Eyring is shorter at high absorption. At a_bar 0.05 the two converge (3.67 s vs 3.77 s).

## 4. Limitations

Frequency-average coefficients hide the band-by-band picture. Use Eyring for studios, control rooms, and heavily-treated
spaces; Sabine for a quick live-room estimate. The acoustician and the venue govern the treatment design.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1224` pins the Eyring equation, the Sabine comparison, the high-absorption ordering
  (Eyring < Sabine), the low-absorption convergence, the more-absorption-shorter-RT60 trend, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the a_bar 0.30 example and the a_bar 0.05
  convergence cross-check).
- Formula checked against the Eyring-Norris equation (Eyring, 1930).
