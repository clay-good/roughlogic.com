# roughlogic.com Specification v1730 -- Odor Dilution to Threshold and Stack Height Screen (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Odour is regulated by dilution rather than by concentration: the number of dilutions needed to make a sample undetectable to a panel. It is a measured quantity, and the arithmetic around it connects an emission to what a neighbour smells.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dilution ratio or flow, or a distance at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the dilutions-to-threshold measurement basis with the applicable olfactometry standard and local ordinance named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`odour dilution to threshold`, `odor d/t olfactometry`, `odour emission rate`, `odour complaint dispersion`, `detection versus objectionable odour`.

## 2. The tile

### 2.1 `odor-dilution-threshold` -- Odor Dilution to Threshold and Stack Height Screen

```
dilutions to threshold  D/T, the number of volumes of clean air per volume of sample
                        at which half a trained panel can just detect it
olfactometry            the measurement; a laboratory panel, not an instrument
odour emission rate     ER = D/T x volumetric flow, in odour units per second
downwind                the same dispersion arithmetic as any pollutant
                        (`gaussian-dispersion-screen`)
limits                  many ordinances set a D/T at the property line, commonly 5 to 15
intensity vs threshold  detection threshold and objectionable intensity are different;
                        a plume can be detectable and unobjectionable, or the reverse
```

Odour is measured by dilution because there is no instrument for it. A sample is diluted with clean air in an
olfactometer until a trained panel can only just detect it, and the number of dilutions required is the
measurement -- so odour concentration is expressed in dilutions rather than in mass per volume, and it is a human
panel measurement with the variability that implies.

Once expressed that way it disperses like anything else. An odour emission rate in odour units per second goes
into the same dispersion arithmetic as a mass emission rate, and the downwind D/T falls with distance and with
dilution in exactly the same shape -- which is why the controls are the same ones: higher release, better plume
rise, and greater distance.

The gap between detection and objection is where odour regulation gets difficult. A D/T of 1 means just
detectable; being able to smell something is not the same as finding it objectionable, and the relationship
between them varies enormously with the odour's character. A faintly detectable pleasant odour and a faintly
detectable rendering odour produce very different complaint rates at the same D/T, which is why hedonic tone and
character are assessed alongside the dilution number and why ordinances that regulate D/T alone satisfy nobody.

The practical consequence is that odour complaints are rarely resolved by dispersion alone. Reducing the emission
at source, containing and treating it, is what works, because the dilution required to take a strong odour below
objection is very large.

**Inputs:** the measured dilutions to threshold, the source volumetric flow, the stack height and plume rise, the wind speed and stability, the distance to the receptor, and the applicable property-line D/T limit

**Outputs:** the odour emission rate in odour units per second, the downwind D/T at the entered distance and conditions, that against the property-line limit, the distance at which the limit is met, and the source reduction required to meet the limit at the property line

## 3. Worked example

A source measured by olfactometry at a D/T of 2,400, exhausting 15,000 acfm.

```
odour emission rate = 2,400 x 15,000 / 60 = {2400*15000/60:,.0f} odour units per second
```

That rate goes into the same dispersion arithmetic as any pollutant. If the dispersion at the property line gives
a dilution of 400:1 between the stack and the receptor:

```
D/T at the property line = 2,400 / 400 = 6
```

**Six dilutions at the fence** -- against a typical ordinance limit of 5 to 15, this may or may not comply, and
the answer depends on which ordinance applies.

**The reduction required.** To reach a D/T of 2 at the property line the source has to fall to

```
2 x 400 = 800 D/T at the stack
```

a **{100*(1-800/2400):.0f} percent reduction in odour concentration** -- which is a treatment problem, not a stack
height problem. Getting the same result by dispersion alone would need three times the dilution, which means
roughly doubling the effective stack height.

That is the general finding: **odour is reduced at source or not at all.** The dilution needed to take a strong
odour below objection is large enough that dispersion improvements rarely deliver it, which is why containment,
biofilters, scrubbers, and oxidizers are the answers that work.

**And detection is not objection.** A D/T of 2 is faintly detectable. Whether that generates complaints depends
on the odour's character -- a faint bakery smell and a faint rendering smell at the same D/T produce entirely
different neighbour responses, which is why hedonic tone is assessed alongside the number.

## 4. Scope and non-goals

A screening framework. Dilutions to threshold is a laboratory measurement by dynamic olfactometry to a
standard method with a trained panel, and it cannot be calculated from composition or measured with a field
instrument; panel measurements carry substantial variability and require replication. It does not perform
dispersion modelling (`gaussian-dispersion-screen`), and odour dispersion is additionally sensitive to
short-term peaks that hourly-averaged models do not resolve -- odour is perceived in seconds and models predict
hourly averages, which is a known limitation. It does not address odour character or hedonic tone, which
determine complaint response as much as concentration does, or the community and regulatory context in which
odour complaints are actually resolved. It does not address odour control technology selection. EN 13725 or the
applicable olfactometry standard, the local odour ordinance, the permitting authority, and an odour consultant
govern.
