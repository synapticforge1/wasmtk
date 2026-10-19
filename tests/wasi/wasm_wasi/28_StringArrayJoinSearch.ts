// Audit round 2 (2026-10-19): a string array joins and searches by its TEXT.
//   sw76 `string[].join(sep)` in console.log and in a template printed each slot's pointer and
//        length (`a-b` → `260-1`); a join into a declaration was refused (ld80's join part).
//   sw107 `string[].indexOf` / `includes` compared a slot's pointer with the needle.
type i32 = number;

const t: string = "a-b-c";
const sp: string[] = t.split("-");
const n: i32 = sp.length;
const s1: string = sp[1];
console.log(n, s1);
console.log(sp.join("|"));
const a: string[] = ["a", "b"];
console.log(a.join("-"));

const names: string[] = ["ann", "bo", "cy"];
console.log(`names: ${names.join(", ")}!`);
const joined: string = names.join("/");
console.log(joined, joined.length);
const none: string[] = [];
console.log("[" + none.join("-") + "]", none.indexOf("x"));
const src: string = "k=v;x=y;z";
const parts: string[] = src.split(";");
console.log(parts.join(" | "), parts.includes("x=y"), parts.indexOf("z"), parts.indexOf("q"));
const withEmpty: string[] = ["", "a", ""];
console.log(withEmpty.join("."), withEmpty.indexOf(""), withEmpty.indexOf("a"));

const ws: string[] = ["pear", "apple", "fig", "apple"];
const k: string = "apple";
const h: boolean = ws.includes(k);
const i1: i32 = ws.indexOf(k);
const i2: i32 = ws.indexOf("fig");
const i3: i32 = ws.indexOf("pear");
const i4: i32 = ws.indexOf("zzz");
console.log(h, i1, i2, i3, i4);

const more: string[] = [...names, "dee"];
console.log(more.join(","), more.indexOf("dee"));
function find(w: string): i32 {
  return names.indexOf(w);
}
console.log(find("bo"), find("zz"));
function mix(): void {
  const loc: string[] = ["p", "q"];
  const all: string[] = [...loc, ...names];
  console.log(all.join(""), all.length, all.includes("cy"));
}
mix();
