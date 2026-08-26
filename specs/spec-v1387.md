# roughlogic.com Specification v1387 -- Fire-Protection Water Tank Sizing (NFPA 22) (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group F computes water-supply duration, tanker shuttle capability, and sprinkler system demand, but nothing turns a system demand and a required duration into a stored-water tank volume. That is the number that sizes a private fire-protection tank, and it is the sum of two demands, not one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive system demand, hose allowance, or duration, or a reserve fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): NFPA 22 (private fire service water tanks) for the net usable capacity requirement and NFPA 13 for the duration and hose-stream allowance, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `fire-tank-sizing` -- Fire-Protection Water Tank Sizing (NFPA 22)

```
total demand   = sprinkler system demand + inside and outside hose allowance
net volume     = total demand x duration
gross volume   = net volume / (1 - unusable fraction)
refill check   = gross volume / refill rate = hours to restore
```

The tank has to hold the sprinkler demand *and* the hose allowance for the full required duration -- NFPA 13
requires the hose stream allowance be added to the sprinkler demand at the point of connection, and it is
frequently left out of a tank calculation because it does not appear in the hydraulic calculation of the sprinkler
system itself. On a light-hazard system the hose allowance can be a quarter of the total.

The gross-versus-net distinction is the second thing that gets missed. NFPA 22 requires the tank's *net usable*
capacity to meet the demand: water below the outlet, the vortex-plate allowance, and any dead volume at the bottom
do not count. A tank sized to the net figure is undersized by whatever that fraction is.

The refill line is the operational answer. After a fire, the tank has to be restored, and NFPA 22 sets a
maximum refill time -- so a tank fed by a small well may be the right volume and still be unacceptable.

**Inputs:** sprinkler system demand at the point of connection (gpm), hose stream allowance (gpm), required
duration (min), unusable fraction of tank volume, refill rate (gpm).

**Outputs:** total demand (gpm), net required volume (gal), gross tank volume (gal), and refill time (hr).

## 3. Worked example

An ordinary-hazard system demanding 750 gpm at the riser, a 250 gpm hose allowance, 60 minute duration, 8%
unusable, refilled at 60 gpm:

```
total demand = 750 + 250       = 1,000 gpm
net volume   = 1,000 x 60      = 60,000 gal
gross volume = 60,000 / 0.92   = 65,217 gal  -> a 70,000 gal tank
refill       = 65,217 / 60     = 1,087 min = 18.1 hr
```

Note what the hose allowance did: without it the net volume would be 45,000 gal and a 50,000 gal tank would have
looked adequate. The allowance is a quarter of the tank. And the 18 hour refill is on the edge -- NFPA 22 limits
restoration time, so a slower well would force either a larger source or a smaller stored volume with a different
supply arrangement.

## 4. Scope and non-goals

Volume arithmetic against a demand the user supplies. The sprinkler demand itself comes from a hydraulic
calculation (the catalog's sprinkler system demand tile is a screen, not that calculation), and the required
duration comes from the hazard classification in NFPA 13, which this tile does not determine. It does not size
the tank structurally, address heating and freeze protection, the fill and overflow arrangement, level alarms,
the suction connection and vortex plate, or the seismic requirements -- all of which NFPA 22 covers and all of
which are engineering. Private fire service water supplies are designed and stamped. The fire protection
engineer, NFPA 22 and NFPA 13, and the AHJ govern.
