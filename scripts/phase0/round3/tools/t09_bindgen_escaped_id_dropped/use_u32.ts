import { loadModule } from "./u32lib.bindings.ts";
const m = await loadModule("u32lib.wasm") as unknown as Record<string, () => unknown>;
console.log("big() =", m.big());
console.log("list in binding:", typeof m.list);
