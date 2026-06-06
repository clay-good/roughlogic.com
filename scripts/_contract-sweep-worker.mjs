// Worker that runs the full v18 contract sweep in isolation. Run inside a
// worker (with a heap cap and a wall-clock timeout imposed by the parent)
// so that a regression which reintroduces an unbounded loop or allocation
// surfaces as a gate failure (timeout / OOM) rather than an infinite CI
// hang. Posts only serialisable violation records back to the parent.
import { parentPort } from "node:worker_threads";
import { runContractSweep } from "../test/fixtures/tile-contract.js";

const { tier1, tier2, ran, skipped } = await runContractSweep();
parentPort.postMessage({
  tier1: tier1.map((r) => ({ sig: r.sig, message: r.message })),
  tier2: tier2.map((r) => ({ sig: r.sig, message: r.message })),
  ran,
  skipped,
});
