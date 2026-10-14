/**
 * wasmmerge foreign-runtime guard — unit tests (no Go/TinyGo toolchain required).
 *
 * mergeWasmWat() must REJECT any module that carries its own growing allocator /
 * language runtime (detected by a `memory.grow` in the module) BEFORE it reaches
 * the per-function `call_indirect` guard, because merging a runtime module into
 * wasmtk's single shared linear memory would silently corrupt state once it
 * allocates. This is the signature of a STANDARD-Go WASI module (full runtime +
 * GC). A mergeable leaf (TinyGo `wasm-unknown`, FixedBufferAllocator, etc.) never
 * calls memory.grow and must NOT trip the guard.
 *
 * See cmem/polyglot-producers.md ("allocation is the gate") and
 * src/wasmmerge.ts (module-level memory.grow guard).
 */
import { assert, assertEquals, assertThrows } from "jsr:@std/assert";
import wabtInit from "wabt";
import { mergeWasmWat } from "../src/wasmmerge.ts";

// A module that grows its own memory — stands in for standard-Go / any full runtime.
const GROWING = `(module
  (func $grow (export "grow") (param $p i32) (result i32)
    (memory.grow (local.get $p)))
  (memory (export "memory") 1))`;

// An alloc-free leaf — stands in for a TinyGo wasm-unknown / FixedBufferAllocator lib.
const LEAF = `(module
  (func $addi (export "addi") (param $a i32) (param $b i32) (result i32)
    (i32.add (local.get $a) (local.get $b)))
  (memory (export "memory") 1))`;

Deno.test("mergeWasmWat rejects a growing (runtime) module with actionable guidance", () => {
  const err = assertThrows(
    () => mergeWasmWat(GROWING, "stdlib", 0),
    Error,
    "memory.grow",
  );
  const msg = String(err);
  // The message must name the real blocker (runtime/allocator) and the Go fix path,
  // NOT the red-herring call_indirect "refactor to direct calls" advice.
  if (!/growing allocator|language runtime/.test(msg)) {
    throw new Error("guard message must name the growing allocator / runtime");
  }
  if (!/STANDARD Go|wasm-unknown/.test(msg)) {
    throw new Error("guard message must point Go users at the mergeable-leaf path");
  }
  if (/refactor.*direct calls/i.test(msg)) {
    throw new Error("guard must not surface the call_indirect red herring for a runtime module");
  }
});

Deno.test("mergeWasmWat does NOT trip the runtime guard for an alloc-free leaf", () => {
  // The contract under test is precisely: memory.grow present -> throw; absent -> no throw.
  // (An alloc-free leaf — TinyGo wasm-unknown, FixedBufferAllocator — never grows memory.)
  // A well-formed leaf therefore merges without the runtime guard firing.
  mergeWasmWat(LEAF, "mathleaf", 0); // must not throw
});

// ── Shapes binaryang 1.9.0+'s optimizer emits (found bumping to 1.12.0, 2026-10-13) ──────────────
// mergeWasmWat reads a library as the backend PRINTS it, so each case goes WAT → binary → text.
const wabt = await (wabtInit as () => Promise<WabtLike>)();
type WabtLike = {
  parseWat(n: string, t: string, f: Record<string, boolean>): { toBinary(o: object): { buffer: Uint8Array }; destroy(): void };
  readWasm(b: Uint8Array, o: Record<string, boolean>): { toText(o: Record<string, boolean>): string; destroy(): void };
};
const printed = (wat: string): string => {
  const p = wabt.parseWat("t.wat", wat, { enable_all: true });
  const bytes = new Uint8Array(p.toBinary({}).buffer);
  p.destroy();
  const m = wabt.readWasm(bytes, { readDebugNames: false });
  const text = m.toText({ inlineExport: false });
  m.destroy();
  return text;
};

Deno.test("a block's multi-value signature named by type index is spelled inline", () => {
  // (block (type 0)) prints as an index; the library's type section is not copied, so in the
  // program index 0 is another signature (every dynrt bundle failed validation).
  const lib = printed(`(module
    (type $pair (func (result i32 i32)))
    (func (export "sum2") (param i32) (result i32)
      (block (type $pair) (local.get 0) (i32.const 1))
      i32.add)
    (memory 1))`);
  const r = mergeWasmWat(lib, "pairlib", 0);
  assert(!/\(type\s+\d+\)/.test(r.funcWat), `a type index survived:\n${r.funcWat}`);
  assert(/\(result i32 i32\)/.test(r.funcWat), `the block lost its signature:\n${r.funcWat}`);
});

Deno.test("the allocator unifies by the exported __heap_ptr when $__malloc was inlined away", () => {
  // No $__malloc function (the optimizer inlined it): the bump lives in a function that also
  // touches other state. Before the export, the library kept a private heap and its 0-initialized
  // state global was moved to 131072.
  const lib = printed(`(module
    (global $__heap_ptr (export "__heap_ptr") (mut i32) (i32.const 260))
    (global $count (mut i32) (i32.const 0))
    (func (export "alloc2") (param i32) (result i32) (local i32)
      (local.set 1 (global.get $__heap_ptr))
      (global.set $__heap_ptr (i32.add (local.get 1) (local.get 0)))
      (global.set $count (i32.add (global.get $count) (i32.const 1)))
      (local.get 1))
    (memory 1))`);
  const r = mergeWasmWat(lib, "alloclib", 0);
  assertEquals(r.droppedAllocator, true);
  assert(/global\.get \$__heap_ptr/.test(r.funcWat) && /global\.set \$__heap_ptr/.test(r.funcWat), r.funcWat);
  assert(!/131072/.test(r.globalWat), `a private heap was kept:\n${r.globalWat}`);
  assert(/\(mut i32\) \(i32\.const 0\)/.test(r.globalWat), `the state global lost its 0:\n${r.globalWat}`);
});
