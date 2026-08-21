// spec-v1343: the disambiguation card.
//
// When the ranker cannot separate its top two, the page asks instead of
// guessing. "pressure drop" is compressed-air AND filter; "heat loss" is duct
// AND pipe; "payment" is a loan payment AND PITI. Those are not variants of one
// calculator -- they answer different questions, and picking wrong on a job is
// not a small error.
//
// Lazily imported, never on the first-paint path: the home view carries a hard
// 49 KB JS sub-budget (spec-v10 §H.2) and this only matters once someone has
// searched, which is already well past first paint.

// One short line naming what an option needs, from the spec-v1339 field index
// and its spec-v1342 required flags. Two or three names, then stop -- these are
// field labels, and the same restraint applies as everywhere else in this
// program: no line rather than a bad one.
export async function needsLine(tool) {
  try {
    const mod = await import("./query-fill.js");
    const rows = await mod.loadFields(tool.id, tool.group);
    if (!rows) return "";
    const names = rows.filter((r) => r.r).slice(0, 3).map((r) => String(r.l).toLowerCase());
    if (!names.length) return "";
    return "Needs " + names.join(", ") + ".";
  } catch {
    return "";
  }
}

export function clearPickCard(doc = document) {
  for (const el of doc.querySelectorAll(".pick-card")) el.remove();
}

// `onPick` routes through the SAME pick() the listbox uses, so focus handling,
// prefill and provenance all stay in one place.
export function renderPickCard({ tools, host, lead, onPick }) {
  clearPickCard();
  if (!host || !Array.isArray(tools) || tools.length < 2) return null;

  const card = document.createElement("section");
  card.className = "pick-card";
  card.setAttribute("aria-label", "Which calculator did you mean?");

  const q = document.createElement("h2");
  q.className = "pick-q";
  q.textContent = "Which one did you mean?";
  card.appendChild(q);

  const sub = document.createElement("p");
  sub.className = "pick-sub";
  sub.textContent = "These answer different questions, so it is worth getting right.";
  card.appendChild(sub);

  const picks = document.createElement("div");
  picks.className = "picks";
  for (const tool of tools) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick";

    const name = document.createElement("span");
    name.className = "pick-name";
    name.textContent = tool.name;

    const desc = document.createElement("span");
    desc.className = "pick-desc";
    // Named by the question it answers, not by its group label.
    desc.textContent = typeof lead === "function" ? lead(tool.desc) : "";

    const needs = document.createElement("span");
    needs.className = "pick-needs";
    // A tile outside the field index has no Needs line; render the option
    // without one rather than with a blank.
    needsLine(tool).then((text) => { if (text) needs.textContent = text; });

    btn.append(name, desc, needs);
    btn.addEventListener("click", () => { clearPickCard(); onPick(tool); });
    picks.appendChild(btn);
  }
  card.appendChild(picks);
  host.appendChild(card);
  card.scrollIntoView({ block: "nearest" });
  return card;
}
