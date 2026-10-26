import { loadModule } from "./imp.bindings.ts";
const m = await loadModule("imp.wasm", {
  env: { log: (msg: string) => console.log("log got:", JSON.stringify(msg), typeof msg) },
});
m.go();
