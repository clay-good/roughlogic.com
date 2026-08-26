# roughlogic.com Specification v1362 -- Steam Kettle Heat-Up Time and Steam Demand (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Nothing in the catalog answers how long a steam-jacketed kettle takes to come up to temperature, or how much steam it pulls doing it. Both control production scheduling and boiler sizing in any kitchen that runs kettles, and the two numbers are the same calculation read twice.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive volume, temperature rise, heat input, or latent heat, or an efficiency outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the sensible-heat relation Q = m c dT and the saturated-steam latent heat at the operating pressure (standard steam tables), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `steam-kettle-heatup` -- Steam Kettle Heat-Up Time and Steam Demand

```
mass         = gallons x 8.34 x specific gravity
Q            = mass x specific heat x (T_final - T_start)
useful input = rated input x efficiency
heat-up time = Q / useful input
steam per batch = Q / latent heat at operating pressure
steam rate      = steam per batch / heat-up time
```

A steam-jacketed kettle is a heat exchanger with a known duty, so the arithmetic is the ordinary sensible-heat
relation. What makes it worth a tile is the second reading: dividing the same `Q` by the latent heat of the steam
gives pounds of steam per batch, and dividing that by the heat-up time gives the pounds-per-hour the boiler has
to deliver *during the come-up*. Kettles are sized on batch volume and boilers on peak steam rate, and the peak
is the come-up, not the simmer. A kitchen with four kettles that all start at 6 am has a boiler problem that no
one sees on the equipment schedule.

At 15 psig the latent heat of saturated steam is about 945.6 BTU/lb; higher pressure carries slightly less latent
heat per pound but a larger temperature difference across the jacket, so it heats faster.

**Inputs:** kettle working volume (gal), product specific gravity and specific heat, start and final temperature
(F), rated heat input (BTU/hr), jacket efficiency, latent heat of steam at the operating pressure (BTU/lb).

**Outputs:** batch mass (lb), heat required (BTU), heat-up time (min), steam per batch (lb), and peak steam rate
(lb/hr).

## 3. Worked example

A 40 gal kettle of water-like stock from 60 F to 200 F, rated 100,000 BTU/hr, jacket efficiency 85%, steam at
15 psig:

```
mass       = 40 x 8.34             = 333.6 lb
Q          = 333.6 x 1.0 x 140     = 46,704 BTU
useful     = 100,000 x 0.85        = 85,000 BTU/hr
time       = 46,704 / 85,000       = 0.55 hr = 33.0 min
steam      = 46,704 / 945.6        = 49.4 lb per batch
steam rate = 49.4 / 0.55           = 89.9 lb/hr
```

So one kettle wants roughly 90 lb/hr of steam while it is coming up -- about 3 boiler horsepower. Four of them
starting together want about 10 boiler horsepower for half an hour, and a boiler sized on average load will lose
pressure across the whole kitchen at 6 am. Stagger the starts and the peak halves.

## 4. Scope and non-goals

Come-up only. The tile does not compute the much smaller steam rate needed to hold a simmer, the evaporation loss
during a long cook, or the heat absorbed by the kettle body itself, which adds a few minutes on the first batch
of the day and much less on subsequent ones. It assumes constant specific heat, which is fine for stock and
poor for a product that thickens or changes phase. Direct-steam-injection and electric kettles follow different
efficiencies. The kettle data plate, the steam-system design, and the boiler manufacturer govern.
