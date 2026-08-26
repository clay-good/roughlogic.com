# roughlogic.com Specification v1430 -- Window Film Solar Heat Gain Reduction and Payback (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes solar heat gain through glazing and cooling loads but nothing that prices the cheapest retrofit available for a west-facing glass problem. Window film is bought on a promise, and the arithmetic that turns a pair of SHGC numbers into peak tons removed, annual kilowatt-hours, and a payback period is three lines that nobody writes down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive glass area, incident solar intensity, or equipment efficiency, an SHGC outside 0-1, or a post-film SHGC at or above the original, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the solar heat gain relation (area x SHGC x incident irradiance) and the EER conversion from cooling BTU to electrical input, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `window-film-shgc` -- Window Film Solar Heat Gain Reduction and Payback

```
peak gain before = area x SHGC_before x peak incident irradiance
peak gain after  = area x SHGC_after  x peak incident irradiance
peak reduction   = the difference, in BTU/hr and in tons
annual reduction = area x (SHGC_before - SHGC_after) x irradiance x equivalent full-sun hours
kWh saved        = annual reduction BTU / EER
payback          = installed cost / annual dollar saving
```

Solar heat gain coefficient is the fraction of incident solar energy that ends up as heat inside. Film works by
lowering it, and the saving is the *difference*, multiplied by the glass area and by how hard the sun is hitting
it. That last factor is why orientation dominates: a west exposure at 4 pm in summer is the worst case in almost
every building, both because the irradiance is high and because it coincides with the peak of everything else.

The two outputs answer two different questions. **Peak** reduction in tons is a capacity argument -- a building
whose cooling plant is short may be able to avoid an equipment replacement, and a ton avoided at peak is worth
far more than a ton avoided on average. **Annual** kilowatt-hours is the operating argument, and it converts
through the equipment's EER: dividing cooling BTU by EER gives watt-hours of electrical input, because that is
what EER means.

**Inputs:** glass area, SHGC before and after film, peak incident irradiance for the orientation, equivalent
full-sun hours per year for the orientation, equipment EER, electricity price, installed film cost.

**Outputs:** peak gain before and after, peak reduction in BTU/hr and tons, annual cooling reduction, kWh and
dollars saved, and simple payback.

## 3. Worked example

200 sq ft of west-facing glass, SHGC 0.70 before and 0.35 after film, peak incident 230 BTU/hr per sq ft, 1,200
equivalent full-sun hours, EER 12, electricity at $0.14/kWh, film installed at $9/sq ft:

```
peak reduction = 200 x 0.35 x 230        = 16,100 BTU/hr = 1.34 tons
annual         = 16,100 x 1,200          = 19,320,000 BTU
kWh saved      = 19,320,000 / 12         = 1,610,000 Wh = 1,610 kWh
dollars        = 1,610 x 0.14            = $225 per year
payback        = 200 x 9 / 225           = 8.0 years
```

Eight years on energy alone -- which is a poor investment if energy is the only reason. But 1.34 tons of peak
capacity freed up in a building that is short of cooling, plus the glare and fading control that motivated most
film jobs in the first place, is a different calculation, and it is usually the real one. The tile prints the
energy case honestly so the other reasons have to stand on their own.

## 4. Scope and non-goals

Cooling only. Film lowers SHGC year-round, so in a heating-dominated climate it takes away useful winter solar
gain, and the annual figure here does not net that out -- in a cold climate the true annual saving can be near
zero or negative. Equivalent full-sun hours and peak irradiance are orientation, latitude, climate, and
shading-dependent and must come from local data. The tile does not address visible light transmittance, glare, or
fading, does not evaluate the thermal stress risk that applying absorbing film to annealed or already-stressed
glass creates -- which can break the glass and which voids many glass warranties -- and does not address film
durability, adhesion failure, or insulating-unit seal effects. The film manufacturer, the glass manufacturer's
warranty terms, and a qualified installer govern.
