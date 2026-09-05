# roughlogic.com Specification v1732 -- Respirator Cartridge Service Life Estimate (`calc-cross.js`, Group G Cross-Trade Utilities, industrial hygiene, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; industrial hygiene and safety), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A chemical cartridge adsorbs vapour until it is saturated, and then the wearer is breathing the contaminant with no warning. Change schedules exist because odour warning is not a reliable indicator, and the schedule comes from an estimate rather than from the wearer's nose.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive concentration, breathing rate, or cartridge capacity, or a humidity outside zero to one hundred percent returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the OSHA change schedule requirement under 29 CFR 1910.134 with the cartridge manufacturer service life data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`respirator cartridge change schedule`, `cartridge service life estimate`, `breakthrough respirator vapour`, `osha change schedule cartridge`, `humidity cartridge service life`.

## 2. The tile

### 2.1 `respirator-cartridge-life` -- Respirator Cartridge Service Life Estimate

```
service life       depends on the contaminant, its concentration, the breathing rate,
                   humidity, temperature, and the cartridge
change schedule    OSHA requires a change schedule based on objective data for
                   cartridges used against gases and vapours
estimation         manufacturer software or published models; not a fixed interval
humidity           above about 65% relative humidity, water competes for sites and
                   service life falls substantially
warning properties odour thresholds are unreliable, vary between people, and olfactory
                   fatigue removes them entirely during exposure
end of service     indicators exist for some contaminants; where they do not, the
                   schedule is the only protection
```

The reason a schedule is required rather than "change when you smell it" is that the nose is not a sensor you
can rely on. Odour thresholds vary widely between people, some contaminants have thresholds above their exposure
limits so they are hazardous before they are detectable, and olfactory fatigue means a wearer who could smell the
contaminant at the start of a shift cannot after twenty minutes of exposure. A worker relying on breakthrough
odour is relying on the least reliable part of the system.

Humidity is the environmental variable that shortens service life most and it is easy to miss. Water vapour
adsorbs on the same carbon that adsorbs the contaminant, so a cartridge at 80 percent relative humidity can have a
fraction of its dry-air service life -- and a schedule established in winter can be inadequate in summer with no
other change.

Concentration matters more than exposure time in the way people expect it to. Service life is roughly inversely
proportional to concentration, so doubling the concentration halves the cartridge life -- which means a schedule
built for a typical concentration is wrong for a task at a higher one, and the schedule has to be built for the
worst case the cartridge will see rather than the average.

Particulate filters are entirely different: they load rather than saturate, breathing resistance rises as they
do, and they are changed on resistance or on a schedule for a different reason.

**Inputs:** the contaminant and its concentration, the work rate and breathing rate, the temperature and relative humidity, the cartridge type and its capacity data, and the manufacturer service life model output

**Outputs:** the estimated service life at the entered conditions, the change schedule with a safety factor applied, the service life at an alternative concentration or humidity, the shifts a cartridge covers, and a flag where the contaminant has poor warning properties

## 3. Worked example

A cartridge estimated by the manufacturer's model at 8 hours of service life at 50 ppm, moderate work rate,
50 percent relative humidity.

Applying a common practice of scheduling at half the estimated life:

```
change schedule = 4 hours -- once mid-shift
```

**Now change the conditions:**

```
concentration doubles to 100 ppm  -> service life roughly halves to 4 h -> schedule 2 h
humidity rises to 85%             -> service life falls substantially again
both together                     -> a cartridge that lasted a shift lasts a fraction of one
```

A schedule established for the typical task is wrong for the worst task, and the worst task is what the schedule
has to cover.

**Why not just change when it smells?** Because the wearer cannot rely on that:

```
odour thresholds vary widely between individuals
some contaminants are hazardous below their odour threshold
olfactory fatigue removes the warning after minutes of exposure
```

A worker who could smell the contaminant when they put the respirator on cannot after twenty minutes. That is not
a failure of attention; it is how the sense works, and it is why OSHA requires a schedule based on objective data
rather than on warning properties.

**And the humidity effect is seasonal.** A schedule validated in January can be inadequate in July with nothing
else changed -- which is an argument for building the schedule on the worst credible humidity rather than on the
day it was measured.

## 4. Scope and non-goals

A service-life framework. Cartridge service life must be estimated using the manufacturer's own data or
modelling software for the specific cartridge and contaminant, or by other objective data, and OSHA requires a
change schedule based on that -- a generic interval is not acceptable. Service life models are validated for
single contaminants at steady conditions; mixtures, intermittent exposures, and contaminants with poor adsorption
characteristics are outside them. It does not address respirator selection, which depends on the contaminant, its
concentration relative to the exposure limit and to IDLH, oxygen deficiency, and the assigned protection factor
required. It does not address the rest of the required respiratory protection program: medical evaluation, fit
testing, training, cleaning and storage, and program evaluation, all of which 29 CFR 1910.134 requires and
without which a correct change schedule protects nobody. 29 CFR 1910.134, the cartridge manufacturer's data, and
a qualified industrial hygienist govern.
