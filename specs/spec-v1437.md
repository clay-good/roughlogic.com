# roughlogic.com Specification v1437 -- Cyclone Separator Cut Size and Pressure Drop (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A cyclone is the first stage of nearly every dust collection and pneumatic conveying system, and nothing in the catalog predicts what it will and will not catch. The classical Lapple cut-size relation answers that in one line, and the pressure drop -- counted in inlet velocity heads -- answers what it costs, which is the trade the whole design turns on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive inlet width, inlet velocity, particle density, or effective turn count, or a particle density at or below the gas density, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Lapple cut-size relation d50 = sqrt(9 mu W / (2 pi N V (rho_p - rho_g))) and the velocity-head pressure-drop convention for cyclones, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `cyclone-separator-sizing` -- Cyclone Separator Cut Size and Pressure Drop

```
d50 = sqrt( 9 mu W / (2 pi N V (rho_p - rho_g)) )

  mu    gas viscosity          W  inlet width
  N     effective turns        V  inlet velocity
  rho_p particle density       rho_g gas density

pressure drop = K x rho_g x V^2 / (2 gc)     K commonly 8 velocity heads
```

`d50` is the **cut size**: the particle diameter the cyclone captures with 50% efficiency. Larger particles are
caught more efficiently, smaller ones less, and the efficiency curve is smooth -- a cyclone does not have a sharp
cutoff and never will.

Every term in the numerator hurts and every term in the denominator helps, and reading them tells you how cyclones
are designed. A **narrower inlet** improves the cut because particles have less distance to migrate to the wall.
**Higher velocity** improves it, and so do **more turns**, which is why cyclones are tall and slender rather than
squat. Denser particles are easier. And that is the whole trade: everything that improves the cut also raises the
pressure drop, which goes as velocity *squared*. Doubling the inlet velocity improves the cut size by only 30% and
quadruples the fan power.

**Inputs:** inlet width and velocity, effective number of turns, gas viscosity and density, particle density,
pressure-drop coefficient, and the airflow.

**Outputs:** cut size in feet and microns, pressure drop in psf and inches of water, and the cut size and pressure
drop at a second velocity for the trade-off.

## 3. Worked example

A standard-proportion cyclone with a 0.25 ft inlet width, 5 effective turns, 50 ft/s inlet velocity, handling wood
dust at 90 lb/cubic ft in air (`mu = 1.24e-5 lb/ft-s`, `rho_g = 0.075 lb/cubic ft`):

```
d50 = sqrt(9 x 1.24e-5 x 0.25 / (2 pi x 5 x 50 x 89.925))
    = sqrt(1.975e-10) = 1.405e-5 ft = 4.28 microns

pressure drop = 8 x 0.075 x 50^2 / (2 x 32.174) = 23.3 psf = 4.48 in w.g.
```

Four microns at four and a half inches of water -- a good cyclone and an expensive one to pull air through. Push
the velocity to 70 ft/s chasing a finer cut and the cut size improves only to 3.62 microns, a 15% gain, while the
pressure drop goes to 8.78 in w.g., nearly double. That asymmetry is why cyclones are almost always followed by a
filter rather than pushed harder: the last few microns cost more in fan power than a baghouse does.

## 4. Scope and non-goals

The Lapple model is a first-order design tool from the 1950s and it is approximate. Effective turns `N` is an
empirical figure (commonly 5 to 10 for standard proportions) rather than a measurable one, and the answer scales
with its square root. The model assumes standard cyclone proportions, dilute loading, and non-agglomerating,
spherical particles -- real dust agglomerates, which usually makes the cyclone perform *better* than predicted,
and high loading changes the picture entirely. The tile does not predict the full efficiency curve, size the
cyclone body, address the dust discharge and airlock (a leaking discharge destroys cyclone performance faster than
any geometry error), erosion, or **combustible dust hazards**, which are governed by NFPA 652 and its
industry-specific companions. The equipment manufacturer, NFPA, and OSHA govern.
