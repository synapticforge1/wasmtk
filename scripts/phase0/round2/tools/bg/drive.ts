import { loadModule } from "./hostlib.bindings.ts";
const bytes = await Deno.readFile(new URL("./hostlib.wasm", import.meta.url));
try {
  const m = await loadModule(bytes, { env: { displayShowValue: (v: number) => console.log("host got", v) } });
  m.go(21);
} catch (e) {
  console.log("LOAD/CALL ERROR:", String(e));
}
try {
  const m2 = await loadModule("hostlib.wasm", { env: { displayShowValue: (v: number) => console.log("host got", v) } });
  console.log("string path ok", typeof m2);
} catch (e) {
  console.log("STRING PATH ERROR:", String(e));
}
