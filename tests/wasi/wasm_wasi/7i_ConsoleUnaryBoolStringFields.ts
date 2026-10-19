// Audit round 2 (2026-10-19): console.log prints what JavaScript prints.
//   sw96  `!` and `~` took the whole binary expression: `!a && b` was `!(a && b)`, `~n + 1` was
//         `~(n + 1)`, also inside templates and concatenations;
//   sw102 a comparison printed as 0 / 1 when it started with a method call (`s.toUpperCase() !==
//         "ABD"`, `a.slice(0, 2) === b.slice(0, 2)`) or mixed a struct-array boolean
//         (`ps[1].ok || ps[0].x > 1`); with it sw75's `s.charAt(i) === ""`;
//   sw103 `-h.big` (a bigint field) printed without its `n`;
//   sw98  a string ternary over struct string fields printed a POINTER (`p.n > 1 ? p.s : p.t`),
//         in a template as well, and in a declaration it was refused.
// Found with them: a string compared with `<` / `>` through a method call (`s.toLowerCase() < "b"`)
// compared numbers.
type i32 = number;
type f64 = number;

const ok: boolean = false;
const x: f64 = 0.5;
const n: i32 = 5;
console.log(!ok && x < 0);
console.log(!ok || x < 0);
const a: i32 = ~n + 1;
console.log(a);
console.log(~n + 1);
console.log(~n * 2);
console.log(`${!ok && x < 0} ${~n + 1} ${~n * 2}`);
console.log("v=" + (!ok || x < 0));
console.log(!(ok && x > 0), !ok);
console.log(~(n + 1), ~n);

const s: string = "abd";
const t: string = "abc";
const i: i32 = 7;
console.log(s.toUpperCase() !== "ABD");
console.log(s.toUpperCase() === "ABD");
console.log(s.slice(0, 2) === t.slice(0, 2));
console.log(s.charAt(i) === "", s.charAt(0) === "a");
console.log(`${s.toUpperCase() === "ABD"}`);
console.log(s.toLowerCase() < "b", s.slice(1) !== "bd");
const lt: boolean = s.toLowerCase() < "b";
console.log(lt);

interface B { x: f64; ok: boolean }
const bs: B[] = [{ x: 1.5, ok: true }, { x: -0.5, ok: false }];
const bb: boolean = bs[1].ok || bs[0].x > 1;
console.log(bb);
console.log(bs[1].ok || bs[0].x > 1);

interface H { big: bigint }
const h: H = { big: 12n };
const d: bigint = -h.big;
console.log(d);
console.log(-h.big, h.big, `${-h.big}`);

interface P { n: i32; s: string; t: string }
const p: P = { n: 2, s: "aa", t: "bbb" };
console.log(p.n > 1 ? p.s : p.t);
console.log(`${p.n > 1 ? p.s : p.t}`);
const ps: P[] = [{ n: 2, s: "aa", t: "bbb" }, { n: 0, s: "c", t: "d" }];
console.log(ps[1].n > 1 ? ps[1].s : ps[1].t, `${ps[0].n > 1 ? ps[0].s : ps[0].t}`);
const v: string = ps[0].n > 1 ? ps[0].s : ps[0].t;
const w: string = `${ps[0].s}|${ps[1].n > 1 ? ps[1].s : ps[1].t}`;
console.log(v, w);
