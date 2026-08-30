# Inline notice variants

Every calculator tile carries a per-view inline notice. The wording is fixed; only the variant changes per group / per id. The notice is rendered above the tool's input region, with `role="note"` for assistive tech.

The variant is selected in `app.js` (the `view-tool` mounting path). Per-id overrides take precedence over per-group selection so cross-trade reference tiles (e.g., `sales-tax-nexus` lives in Group H but carries the legal-information variant) get the right message.

## Variants in use

| Variant | Constant | Wording |
|---|---|---|
| Default (AHJ-governs) | `NOTICE_DEFAULT` | "Math aid only. Local code, manufacturer specs, and the AHJ govern the work." |
| Fire-ground SOP | `NOTICE_FIRE` | "Math aid only. Department SOPs and incident command govern the fireground." |
| Historical reference | `NOTICE_HISTORICAL` | "Reference only. Prices change; ask your supplier for a current quote." |
| Tax-law (v5) | `NOTICE_TAX_LAW` | "Estimate only. Confirm with the current IRS publication or a CPA before filing." |
| Legal-information (v5) | `NOTICE_LEGAL` | "Legal information, not legal advice. Verify with current state code and an attorney." |
| Bench-science (v5) | `NOTICE_LAB` | "Check your lab's SOP before pipetting. A bad dilution ruins the run." |
| Real estate (v12) | `NOTICE_REAL_ESTATE` | "Estimate only. The lender governs underwriting; the appraiser governs value." |
| Education (v12) | `NOTICE_EDUCATION` | "Estimate only. The classroom teacher governs placement and assessment calls." |
| Worker-safety (per-tool) | inlined per renderer | e.g., utility 268 lab-safety carries "If a chemical spill exceeds your lab's spill-kit capacity or involves an unknown agent, stop, evacuate, and call your environmental health and safety office or 911." |

Groups S (legal), U (veterinary), V (EMS) and W (aviation) were retired, and their
`NOTICE_LEGAL`-adjacent variants went with them: `NOTICE_VETERINARY`, `NOTICE_EMS`
and `NOTICE_AVIATION` no longer exist in `app.js`. `NOTICE_LEGAL` survives, reached
only through the `sales-tax-nexus` per-id override. `scripts/check-notice-variants.mjs`
now holds this file to the selector in `app.js` in both directions, so a retired
variant cannot linger here again.

## Selection rules

The selector in `app.js` runs in this order:

1. **Per-id overrides.** Group H reference tiles that span trades:
   - `sales-tax-nexus` -> `NOTICE_LEGAL` (post-Wayfair guidance is a legal threshold, not a code requirement)
   - `irs-form-index` -> `NOTICE_TAX_LAW` (IRS forms are tax administration)
2. **Per-group rules.**
   - Group Q (historical) -> `NOTICE_HISTORICAL`
   - Group R (accounting / tax) -> `NOTICE_TAX_LAW`
   - Group T (lab) -> `NOTICE_LAB`
   - Group X (real estate) -> `NOTICE_REAL_ESTATE` (v12 §8)
   - Group Y (educators) -> `NOTICE_EDUCATION` (v12 §9)
3. **Fire-ground rule.** Group F -> `NOTICE_FIRE`, and so does any tile outside Group F whose `trades` array includes `fire` **unless** it is also tagged for electrical *and* plumbing *and* HVAC. That six-trade tag means "every trade", not "the fireground": it is how `sales-tax`, `loan-payment`, `unit-converter`, `timesheet`, and 16 others ended up telling a reader that incident command governed their answer. Those fall through to the default. The 33 tiles that keep the variant are the genuinely fire- and SAR-adjacent ones (ladder angle, fall-protection clearance, search track spacing, NAC voltage drop).
4. **Default.** All other tiles -> `NOTICE_DEFAULT`.

## Adding a new variant

1. Add a `NOTICE_<NAME>` constant near the top of `app.js`.
2. Add the matching `GOVERNANCE.<name>` entry in `citations.js` so the v6 reference block on each tile renders the same wording from the structured citation.
3. Wire the selection rule in the same priority block in `app.js`.
4. Update this file with the wording and the rule. `scripts/check-notice-variants.mjs` fails if the constant, its wording, or its selection rule is missing here -- or if this file names one `app.js` no longer defines.
5. Verify with `npm test` (the v6 audit asserts every tile id has a `CITATIONS` entry whose `governance` matches one of the bundled variants).

## What a notice is for

The notice exists so a casual user who lands on a tile from a search engine, a coworker's link, or a hash bookmark gets the constraint of the calculation in one sentence before reading any number. It is the load-bearing answer to the question "should I rely on this?" and the answer is always: not without verifying against the controlling authority (AHJ, IRS, state code, your lab's SOP).

The notice is not a disclaimer for the project's benefit. It is a specification of who is in charge of the answer.
