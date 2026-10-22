// The reference against Deno.inspect on many generated arrays (sw67, 2026-10-13: 444 arrays, 0
// differ). Run: deno run scripts/console/check_inspect_array_ref.ts
// It stays on DENO (2026-10-21): Deno.inspect IS what it checks against, and there is no portable
// stand-in. Measured on the same 444 arrays: node:util's inspect has the layout but quotes strings
// with ' (61 differ), Bun.inspect does not group columns at all (334 of 441 differ). Revisit with
// the Deno-exit plan's M3 (wasic keeps the Deno / Node layout).
import { type Elem, formatArray } from "./inspect_array_ref.ts";
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const gens: Array<() => Elem> = [
  () => Math.floor(rnd() * 10),
  () => Math.floor(rnd() * 100000) - 50000,
  () => Math.floor(rnd() * 2147483647) * (rnd() < 0.5 ? -1 : 1),
  () => rnd() * 1000,
  () => (rnd() < 0.5 ? -0 : 1.5),
  () => ["a", "bb", "ccc", "hello world", 'q"uote', "it's", 'b"o\'th', "tab\there", "nl\nx", "back\\slash"][Math.floor(rnd() * 10)],
  () => rnd() < 0.5,
];
let bad = 0, n = 0;
const sizes = [0, 1, 2, 3, 5, 6, 7, 8, 10, 12, 16, 20, 26, 33, 40, 64, 99, 100, 101, 150, 250];
for (const size of sizes) {
  for (let g = 0; g < gens.length; g++) {
    for (let rep = 0; rep < 3; rep++) {
      const arr = Array.from({ length: size }, gens[g]);
      const want = Deno.inspect(arr);
      const got = formatArray(arr);
      n++;
      if (want !== got) {
        bad++;
        if (bad <= 6) console.log(`size ${size} gen ${g}:\n--- deno\n${want}\n--- ref\n${got}\n`);
      }
    }
  }
}
// mixed numbers and strings (padEnd path)
for (const size of [7, 12, 30]) {
  const arr: Elem[] = Array.from({ length: size }, (_, i) => (i % 2 ? i * 7 : "s" + i));
  n++;
  if (Deno.inspect(arr) !== formatArray(arr)) {
    bad++;
    console.log(`mixed ${size}:\n${Deno.inspect(arr)}\n---\n${formatArray(arr)}`);
  }
}
console.log(`${n} arrays, ${bad} differ`);
