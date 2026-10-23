
import { loadModule } from "./fnany_50.bindings.ts";
const wasmBytes = await Deno.readFile(new URL("./fnany_50.wasm", import.meta.url));
const m = await loadModule(wasmBytes);
const dbl = m.getDoubler() as ((x: number) => number) & { release(): void };
console.log(dbl(21));
dbl.release();
