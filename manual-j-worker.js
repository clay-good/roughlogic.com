// Web Worker host for the Manual J cooling and heating estimators and the
// duct sizing calculator. Same compute functions as calc-hvac.js, executed
// off the main thread so multi-zone inputs do not block the UI.

import { manualJCooling, manualJHeating, computeDuctSize } from "./calc-hvac.js";

self.addEventListener("message", (e) => {
  const { id, kind, inputs } = e.data || {};
  let result;
  if (kind === "cooling") result = manualJCooling(inputs);
  else if (kind === "heating") result = manualJHeating(inputs);
  else if (kind === "duct") result = computeDuctSize(inputs);
  else result = { error: "Unknown kind." };
  self.postMessage({ id, result });
});
