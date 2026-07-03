
import { loadModule } from "file:///<repo-root>/tests/module/bindgen_fixtures/fnany_50.bindings.ts";
const wasmBytes = await Deno.readFile(new URL("file:///<repo-root>/tests/module/bindgen_fixtures/fnany_50.wasm"));
const m = await loadModule(wasmBytes);
const dbl = m.getDoubler() as ((x: number) => number) & { release(): void };
console.log(dbl(21));
dbl.release();
