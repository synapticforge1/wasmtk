// 2026-10-06, the items found during wasm-math Phase 1:
//   sw41: console.log(-0) printed 0. console.log formats -0 as "-0"; string conversion
//         (`${-0}`, String(-0), "x" + -0) gives "0", and still does.
//   ld16: String(x) inside console.log called an undefined `$String`.
//   sw42: String(<string>) printed the string's pointer (`260`), in a declaration too.
//   ld17: console.log of an f32 value built an invalid module.
type i32 = number;
type f32 = number;
type f64 = number;

const nz: f64 = -0;
const pz: f64 = 0;
console.log(nz);
console.log(nz, "x", pz, nz);
console.log(`${nz}`, "v=" + nz);
console.log(Math.round(-0.4), Math.sign(nz), -0.0);
console.log(true ? nz : 1);
console.log(String(nz));

const x: f64 = 2.5;
const n: i32 = 7;
const flag: boolean = true;
const s: string = "ab";
console.log(String(x), String(n), String(flag), String(s));
console.log("s=" + String(x), String(n) + "!", `t=${String(flag)}`);
const t: string = String(s);
console.log(t, t.length);

const z: f32 = 1.5;
function half(v: f32): f32 {
  return v / 2;
}
console.log(z, half(z));
console.log("z=", z);

function show(k: f64, w: f32): void {
  console.log(k, w, String(k));
}
show(nz, z);
