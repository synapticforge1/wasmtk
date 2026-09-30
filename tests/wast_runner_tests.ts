/**
 * wast_runner_tests.ts — checks on the wast RUNNER itself, with fixtures whose outcome is known.
 *
 * The corpus gate (`wast_tests.ts`) can only show that the runner agrees with the spec files on
 * today's toolchain. A runner that scores too leniently passes that gate as long as nothing happens
 * to trap for the wrong reason, so each check here plants the wrong outcome on purpose.
 *
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

console.log(`\n  wast runner: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
