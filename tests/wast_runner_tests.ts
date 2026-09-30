/**
 * wast_runner_tests.ts — checks on the wast RUNNER itself, with fixtures whose outcome is known.
 *
 * The corpus gate (`wast_tests.ts`) can only show that the runner agrees with the spec files on
 * today's toolchain. A runner that scores too leniently passes that gate as long as nothing happens
 * to trap for the wrong reason, so each check here plants the wrong outcome on purpose.
 *
 *   custom-page-sizes lowering (2026-09-30): with the option, a module V8 refuses for custom page
 *   sizes is lowered and run; without it, an engine skip; an `assert_invalid` is never lowered.
 *   trap kind (2026-09-30): an `assert_trap` passes only on the KIND its message names. A trap of
 *   another kind is a failure; a message with no mapping is a skip, never a pass.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-run --allow-env tests/wast_runner_tests.ts
 *
 * @license MIT
 */

import { join } from "jsr:@std/path";
import { runWast } from "../src/wast.ts";

let passed = 0;
let failed = 0;
function ok(desc: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ ${desc}${detail ? `\n    ${detail}` : ""}`);
  }
}

const FIXTURES = join(import.meta.dirname ?? ".", "wast_runner");

console.log("\n  trap kind:");
const r = await runWast(join(FIXTURES, "trap_kind.wast"), { maxFailures: 10 });
const summary = `passed=${r.passed} failed=${r.failed} skipped=${r.skipped} failures=${
  JSON.stringify(r.failures)
} skips=${JSON.stringify(r.skipReasons)}`;
ok("right-kind traps pass (oob, divide by zero, prefix rule)", r.passed === 3, summary);
ok('`unreachable` for "out of bounds memory access" FAILS', r.failed === 1, summary);
ok(
  "the failure names both kinds",
  r.failures.some((f) =>
    f.includes("wrong kind") && f.includes("out of bounds memory access") &&
    f.includes("unreachable")
  ),
  summary,
);
ok(
  "an unmapped message is a SKIP, not a pass",
  r.skipped === 1 && Object.keys(r.skipReasons).some((k) => k.includes("trap kind not mapped")),
  summary,
);

console.log("\n  custom-page-sizes lowering:");
const cps = join(FIXTURES, "custom_page_sizes.wast");
const on = await runWast(cps, { maxFailures: 10, lowerCustomPageSizes: true });
const off = await runWast(cps, { maxFailures: 10 });
const show = (x: typeof on) =>
  `passed=${x.passed} failed=${x.failed} skipped=${x.skipped} unbuilt=${x.modulesFailed} lowered=${
    JSON.stringify(x.lowered)
  } rejectedValid=${x.validatorRejectedValid.length} failures=${JSON.stringify(x.failures)}`;
ok(
  "on: the module is lowered and all 4 behaviour assertions pass, the trap as out-of-bounds",
  on.passed === 5 && on.failed === 0 && on.skipped === 0 && on.lowered.modules === 1 &&
    on.lowered.passes === 4,
  show(on),
);
ok(
  "on: the lowered module passes binaryang's validator (the oracle guard covers lowering)",
  // `lowered.modules === 1` too: an empty rejection list alone is also what NO lowering looks like
  // (it passed vacuously against the runner without the option).
  on.lowered?.modules === 1 && on.validatorRejectedValid.length === 0,
  show(on),
);
ok(
  "off: the module is an engine skip, its assertions skip, nothing is lowered",
  off.passed === 1 && off.modulesFailed === 1 && off.skipped >= 4 && off.lowered.modules === 0 &&
    off.engineLimits["custom page sizes"] !== undefined,
  show(off),
);
ok(
  "assert_invalid is never lowered: it passes on binaryang's verdict either way",
  on.passed - on.lowered.passes === 1 && off.passed === 1,
  `on: ${show(on)}\n    off: ${show(off)}`,
);

console.log(`\n  wast runner: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
