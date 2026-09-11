# roughlogic.com Specification v1842 -- Optical Return Loss and Connector Reflectance (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Light reflected back down a fibre destabilises the laser that sent it, and the worst reflector in a link sets the link's return loss almost single-handedly. One unmated connector turns a good link into a bad one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive connector count, a reflectance that is not negative in decibels, an index of refraction at or below 1, or a non-positive requirement returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Fresnel reflection relation and the linear addition of reflected powers with the transceiver manufacturer's return loss requirement and the applicable test standards named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`optical return loss`, `connector reflectance upc apc`, `fresnel reflection fiber end`, `orl link budget`, `rf over glass return loss`.

## 2. The tile

### 2.1 `optical-return-loss` -- Optical Return Loss and Connector Reflectance

```
reflectance      the ratio of reflected to incident power at one event, quoted
                 as a NEGATIVE dB figure; more negative is better
optical return   the total reflected power referred to the launch, quoted as a
loss             POSITIVE dB figure; larger is better
combining        reflected powers ADD in linear terms, not in decibels:
                 ORL = -10 log10(sum of the linear reflectances)
Fresnel          a flat glass-to-air interface reflects ((n1-n2)/(n1+n2))^2,
                 about 3.60% -- a reflectance of only about -14.4 dB
connector types  a physical contact connector reaches about -35 dB, an ultra
                 physical contact about -50, an angled physical contact about -60
                 because its angled face sends the reflection into the cladding
the dominance    the single worst reflector dominates the sum; everything better
                 than it contributes almost nothing
why it matters   reflected light destabilises a laser and raises its noise; analog
                 video and high-rate coherent systems are the least tolerant
```

Reflectance and return loss are the same physics reported from opposite ends and both conventions are in daily
use, which is a reliable source of confusion. Reflectance describes one event and is negative because it is a
fraction of the incident power. Return loss describes the whole link and is positive because it is a loss.
A specification asking for better than minus fifty and one asking for better than fifty are asking for the same
thing, and a technician has to read which quantity is meant.

Adding reflections in linear terms is what makes one bad event decisive. Decibels cannot be added, and the
worst reflector contributes so much more linear power than the good ones that it effectively becomes the
answer. A link of excellent connectors with one open end is not a slightly worse link; it is an open-ended
link with some connectors on it.

That is why an unmated connector is a fault rather than an inconvenience. The bare glass face against air is a
Fresnel reflector at about four percent, which is enormously more than any connector in the path, and it sends
that power straight back into the transmitter. Dust caps on unused ports are not tidiness; an unterminated port
left open is a reflector, and on a shared feed it degrades every service on it.

**Inputs:** the number of connectors and their reflectance, the presence of any unmated or flat-cleaved end, the fibre index of refraction, and the required link optical return loss

**Outputs:** the Fresnel reflectance of a bare glass end, the link optical return loss with the entered connectors, the same link with one unmated end, the link with angled physical contact connectors, and the margin against the requirement

## 3. Worked example

A link with 4 ultra physical contact connector pairs at -50 dB reflectance each:

```
each     = 10^(-50/10) = 1.00e-05
sum      = 4 x 1.00e-05 = 4.00e-05
ORL      = -10 log10(4.00e-05) = 44.0 dB
```

**44.0 dB, comfortably past a 32 dB requirement.** Now leave one connector unmated:

```
bare glass to air: R = ((1.468 - 1) / (1.468 + 1))^2 = 0.03596 = 3.60%
                   reflectance = -14.4 dB
sum = 0.03596 + 4.00e-05 = 0.03600
ORL = 14.4 dB
```

**14.4 dB. The link went from 44 dB to 14 dB from one open port**, and it now fails a 32 dB
requirement by 18 dB. **The four good connectors contributed 0.11 percent of the reflected power and are
irrelevant.**

**That is what adding in linear terms means.** The bare end reflects 3,596 times as much power as a good
connector, so it is not one contributor among five -- **it is the answer, and the others are rounding.**

**Angled connectors are the remedy where return loss matters:**

```
4 APC pairs at -60 dB: ORL = 54.0 dB
```

**10 dB better than UPC**, because the angled endface sends its reflection into the cladding where it is
lost rather than back down the core. **That is why analog video and other reflection-sensitive services are
built on angled connectors throughout**, and why mixing an angled and a flat connector in one mating is both a
loss fault and a return loss fault.

**And a dust cap is not tidiness.** An unterminated port left open is a Fresnel reflector at 3.6 percent, and on
a shared feed **it degrades every service on that path.**

## 4. Scope and non-goals

A reflectance combination. It assumes the reflected power from each event returns undiminished, which overstates the contribution of distant events -- each reflection is attenuated by the round-trip fibre loss to it, so a far reflector matters less than a near one and the link's worst case is a reflector close to the transmitter. It does not address the effect of return loss on a particular transmitter: the tolerance depends entirely on the laser and the modulation format, ranging from a few decibels of relative intensity noise degradation in a directly modulated system to severe penalties in analog video, and the equipment specification is what sets the requirement. Reflectance values are entered and are nominal figures for connector grades; the achieved value depends on endface geometry, cleanliness, and mating condition, and a dirty or damaged endface degrades both loss and reflectance together. It does not measure anything: an OTDR reports event reflectance and an optical continuous-wave reflectometer measures link return loss, and they are different measurements that do not always agree. It does not address reflections from non-connector events such as breaks, bad splices, or bends. The transceiver manufacturer's return loss requirement, the connector manufacturer's reflectance specification, and the applicable test standards govern.
