/**
 * wasi_host.ts — ONE WASI preview-1 host on `node:` builtins, so a compiled module runs the same
 * way under Deno, Bun and Node (Deno-exit plan P0, 2026-10-26). It is the harness's host, not the
 * product's (`src/utils.ts` `runWasi` stays the CLI's).
 *
 *   deno run -A scripts/migr/wasi_host.ts x.wasm [args…]
 *   bun scripts/migr/wasi_host.ts x.wasm [args…]
 *   node --experimental-strip-types scripts/migr/wasi_host.ts x.wasm [args…]   (Node 22; 24+ strips by default)
 *
 * stdout / stderr are the module's fd 1 / 2; the exit code is `proc_exit(n)`'s `n`, 1 for a trap or
 * an uncaught exception (wasmtime's convention, as `wasmtk run`). Imports a module needs that are
 * not WASI preview 1 (`env`) are refused: wasic's WASI programs import none.
 */
import { readFileSync, writeSync } from "node:fs";
import { randomFillSync } from "node:crypto";
import process from "node:process";

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error("usage: wasi_host.ts <module.wasm> [args…]");
  process.exit(2);
}

// erasable TypeScript only (Node strips types; a parameter property is not erasable)
class Exit {
  code: number;
  constructor(code: number) {
    this.code = code;
  }
}

let memory: WebAssembly.Memory | undefined;
const view = () => new DataView(memory!.buffer);
const bytes = () => new Uint8Array(memory!.buffer);
const argv = [file.replace(/^.*[\\/]/, ""), ...rest].map((a) => new TextEncoder().encode(a + "\0"));
const ESUCCESS = 0, EBADF = 8, ENOSYS = 52;

const wasi: Record<string, (...a: number[]) => number | void> = {
  fd_write(fd, iovs, iovsLen, nwritten) {
    if (fd !== 1 && fd !== 2) return EBADF;
    let total = 0;
    for (let i = 0; i < iovsLen; i++) {
      const ptr = view().getUint32(iovs + i * 8, true);
      const len = view().getUint32(iovs + i * 8 + 4, true);
      if (len > 0) writeSync(fd, bytes().subarray(ptr, ptr + len));
      total += len;
    }
    view().setUint32(nwritten, total, true);
    return ESUCCESS;
  },
  fd_read(_fd, _iovs, _iovsLen, nread) {
    view().setUint32(nread, 0, true); // stdin is empty
    return ESUCCESS;
  },
  proc_exit(code) {
    throw new Exit(code);
  },
  args_sizes_get(count, size) {
    view().setUint32(count, argv.length, true);
    view().setUint32(size, argv.reduce((n, a) => n + a.length, 0), true);
    return ESUCCESS;
  },
  args_get(ptrs, buf) {
    let at = buf;
    argv.forEach((a, i) => {
      view().setUint32(ptrs + i * 4, at, true);
      bytes().set(a, at);
      at += a.length;
    });
    return ESUCCESS;
  },
  environ_sizes_get(count, size) {
    view().setUint32(count, 0, true);
    view().setUint32(size, 0, true);
    return ESUCCESS;
  },
  environ_get() {
    return ESUCCESS;
  },
  clock_time_get(_id, _precision, out) {
    view().setBigUint64(out, process.hrtime.bigint(), true);
    return ESUCCESS;
  },
  random_get(buf, len) {
    randomFillSync(bytes().subarray(buf, buf + len));
    return ESUCCESS;
  },
  fd_fdstat_get() {
    return ESUCCESS;
  },
};
const wasiProxy = new Proxy(wasi, {
  get: (t, k: string) => t[k] ?? (() => ENOSYS),
});

const module = new WebAssembly.Module(readFileSync(file));
for (const imp of WebAssembly.Module.imports(module)) {
  if (imp.module !== "wasi_snapshot_preview1") {
    console.error(`wasi_host: import ${imp.module}.${imp.name} is not WASI preview 1`);
    process.exit(2);
  }
}
const instance = new WebAssembly.Instance(module, { wasi_snapshot_preview1: wasiProxy });
memory = instance.exports.memory as WebAssembly.Memory;
let code = 0;
try {
  (instance.exports._start as () => void)();
} catch (e) {
  if (e instanceof Exit) code = e.code;
  else {
    process.stderr.write(
      `wasi_host: ${e instanceof WebAssembly.Exception ? "uncaught wasm exception" : String(e)}\n`,
    );
    code = 1;
  }
}
process.exit(code & 0xff);
