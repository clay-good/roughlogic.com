// v10 Phase B.1 limitation-banner shared component (spec-v10.md §4.1).
//
// Renders a tile-specific "what this is NOT" banner above the inputs on
// simplified-screening tiles (Manual J, arc-flash incident-energy
// screen, ASHRAE 62.1 outdoor-air ventilation, stair-stringer, slope-
// angle screen, sous-vide pasteurization, septic drainfield, service /
// demand load). The banner is visually distinct from the citation
// footer and the result-area context band, and reuses the existing
// .inline-notice palette (which already adapts to High-Contrast).
//
// The component takes a meta-style options object:
//   {
//     headline:     short string ("Not an IEEE 1584 study")
//     replacement:  what code-compliance actually requires
//     who_governs:  short string identifying the AHJ / licensed pro
//     link:         optional free-access URL to the standard's TOC
//   }
//
// Output DOM (vanilla; no innerHTML; no string interpolation into
// markup):
//
//   <aside class="inline-notice limitation-banner" role="note"
//          aria-label="Tool limitations">
//     <strong class="limitation-headline">Not a Manual J load calculation.</strong>
//     <p class="limitation-replacement">A code-compliant load calc
//        requires ACCA Manual J 8th ed.</p>
//     <p class="limitation-governs">The AHJ governs.</p>
//     <p class="limitation-link"><a href="..." rel="noopener">Free
//        access at acca.org</a></p>
//   </aside>
//
// All text content is set via textContent (never innerHTML). The
// optional link is the only anchor; href is whatever the caller
// supplied verbatim. Spec-v10 §1 forbids any new third-party fetch, so
// the link is informational only -- clicking it leaves the site.

const HEADLINE_MAX = 80;
const REPLACEMENT_MAX = 240;
const GOVERNS_MAX = 120;

function clip(s, max) {
  if (typeof s !== "string") return "";
  s = s.trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function renderLimitationBanner(host, opts) {
  if (!host || typeof host !== "object") return null;
  if (!opts || typeof opts !== "object") return null;
  const doc = host.ownerDocument || (typeof document !== "undefined" ? document : null);
  if (!doc) return null;

  const headline = clip(opts.headline, HEADLINE_MAX);
  const replacement = clip(opts.replacement, REPLACEMENT_MAX);
  const governs = clip(opts.who_governs, GOVERNS_MAX);
  if (!headline || !replacement || !governs) return null;

  const aside = doc.createElement("aside");
  aside.className = "inline-notice limitation-banner";
  aside.setAttribute("role", "note");
  aside.setAttribute("aria-label", "Tool limitations");

  const h = doc.createElement("strong");
  h.className = "limitation-headline";
  h.textContent = headline;
  aside.appendChild(h);

  const r = doc.createElement("p");
  r.className = "limitation-replacement";
  r.textContent = replacement;
  aside.appendChild(r);

  const g = doc.createElement("p");
  g.className = "limitation-governs";
  g.textContent = governs;
  aside.appendChild(g);

  if (typeof opts.link === "string" && opts.link.length > 0) {
    const linkP = doc.createElement("p");
    linkP.className = "limitation-link";
    const a = doc.createElement("a");
    // Caller supplies the URL. We do not auto-prepend a scheme; the
    // existing citation convention is bare host+path. Most callers will
    // pass an https:// URL when they want a clickable link; passing a
    // bare host renders as a plain link the browser treats as relative,
    // which is the right safe default if a future href cleanup is run.
    a.href = String(opts.link);
    a.rel = "noopener";
    a.textContent = "Free access: " + clip(opts.link, REPLACEMENT_MAX);
    linkP.appendChild(a);
    aside.appendChild(linkP);
  }

  host.insertBefore(aside, host.firstChild || null);
  return aside;
}

// A small registry of canonical limitation-banner copy for the tiles
// spec-v10 §4.3 names explicitly. Renderers can either pass an `opts`
// object directly or look up the canonical copy by tile id via
// `getLimitationCopy(id)`. Keeping the copy here means a future edit
// (e.g., a Manual J language tweak) is one-file.
const CANONICAL = {
  "manual-j-cooling": {
    headline: "Not a Manual J load calculation.",
    replacement:
      "A code-compliant load calculation requires ACCA Manual J 8th ed. This is a simplified screen.",
    who_governs: "The AHJ and the licensed mechanical designer govern.",
    link: "acca.org",
  },
  "manual-j-heating": {
    headline: "Not a Manual J load calculation.",
    replacement:
      "A code-compliant load calculation requires ACCA Manual J 8th ed. This is a simplified screen.",
    who_governs: "The AHJ and the licensed mechanical designer govern.",
    link: "acca.org",
  },
  "arc-flash-screen": {
    headline: "Not an IEEE 1584 study.",
    replacement:
      "A code-compliant arc-flash incident-energy analysis requires an IEEE 1584-2018 study by a qualified engineer with site-specific data.",
    who_governs: "The AHJ and a qualified electrical engineer govern.",
    link: "ieee.org",
  },
  "outdoor-air-mix": {
    headline: "Not an ASHRAE 62.1 design.",
    replacement:
      "A code-compliant ventilation design requires ASHRAE 62.1 with the AHJ-adopted edition's Rp / Ra values for the project occupancy.",
    who_governs: "The AHJ and the design engineer govern.",
    link: "ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards",
  },
  "outdoor-air-ventilation": {
    headline: "Not an ASHRAE 62.1 design.",
    replacement:
      "Rp and Ra are user-supplied. ASHRAE 62.1 Table 6-1 governs the per-occupancy values for the AHJ-adopted edition. This tool does not bundle the table.",
    who_governs: "The AHJ and the design engineer govern.",
    link: "ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards",
  },
  "stair-stringer": {
    headline: "Not a code-compliance check.",
    replacement:
      "Stair geometry limits (max riser, min tread, headroom) come from the AHJ-adopted code edition (IRC, IBC, or local amendment). User-supplied limits.",
    who_governs: "The AHJ governs final stair geometry.",
    link: "codes.iccsafe.org",
  },
  "slope-avalanche": {
    headline: "Not avalanche training.",
    replacement:
      "Slope-angle screening flags terrain in the avalanche-prone band. It does not assess snowpack, wind, recent loading, or any other condition. Training and a qualified guide remain required.",
    who_governs: "The user, with avalanche training and current local conditions, governs.",
    link: "avalanche.org",
  },
  "sous-vide-pasteurization": {
    headline: "Not a HACCP plan.",
    replacement:
      "Pasteurization-time tables come from public food-safety research; a commercial kitchen requires a HACCP plan signed by a qualified processing authority.",
    who_governs: "The local food-safety authority and a qualified processing authority govern.",
    link: "fda.gov/food/retail-food-protection/fda-food-code",
  },
  "septic-drainfield": {
    headline: "Not a code-compliant septic design.",
    replacement:
      "Drainfield sizing requires a state-approved soil evaluation (perc test or other approved method) and a design by a licensed professional.",
    who_governs: "The state primacy agency and a licensed professional govern.",
    link: "epa.gov/septic",
  },
  "service-load": {
    headline: "Not a final service-size determination.",
    replacement:
      "NEC §220 demand factors compute a minimum. The AHJ may require additional capacity for future loads, a different demand method, or the optional method per §220.82.",
    who_governs: "The AHJ governs final service sizing.",
    link: "nfpa.org/freeaccess",
  },

  // v12 Group V (EMS / Pre-hospital): math aids only; the receiving
  // facility's physician and the agency's medical director govern.

  // v12 Group U (Veterinary): math aids only; the attending
  // veterinarian governs the prescription and the in-clinic plan.
};

export function getLimitationCopy(id) {
  if (typeof id !== "string") return null;
  return CANONICAL[id] || null;
}

export function listLimitationCopyIds() {
  return Object.keys(CANONICAL).sort();
}
