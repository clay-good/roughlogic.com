// v8 §D.1 - Optional cost output helper.
//
// formatCostOutput(quantity, unitPrice, unitName) returns a string
// formatted as USD with two decimals. Cost is never required, never
// persisted, never reported. The renderer wires this behind a "Show
// cost" disclosure to keep mobile clean.

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCost(amount) {
  if (!Number.isFinite(Number(amount))) return "-";
  return USD.format(Number(amount));
}

export function formatCostOutput(quantity, unitPrice, unitName = "unit") {
  if (!Number.isFinite(Number(quantity)) || !Number.isFinite(Number(unitPrice))) return null;
  if (Number(quantity) < 0 || Number(unitPrice) < 0) return null;
  const total = Number(quantity) * Number(unitPrice);
  if (!Number.isFinite(total)) return null;
  return {
    total_usd: total,
    total_text: formatCost(total),
    per_unit_text: formatCost(unitPrice) + " per " + unitName,
    quantity: Number(quantity),
    unit_name: unitName,
  };
}

// Build a small "Show cost" disclosure region. Returns the wrapper plus
// the input so the caller can wire its event handler. The renderer is
// responsible for inserting the wrapper into the input region.
export function buildCostDisclosure({
  unitName = "unit",
  initial = "",
  label = "$ per ",
  ariaId = "cost-input",
} = {}) {
  if (typeof document === "undefined") return null;
  const wrap = document.createElement("details");
  wrap.className = "cost-disclosure";
  const sum = document.createElement("summary");
  sum.textContent = "Show cost (optional)";
  wrap.appendChild(sum);
  const lab = document.createElement("label");
  lab.htmlFor = ariaId;
  lab.textContent = label + unitName;
  const input = document.createElement("input");
  input.type = "number";
  input.id = ariaId;
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.step = "any";
  input.min = "0";
  if (initial !== "" && initial !== null && initial !== undefined) input.value = String(initial);
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}
