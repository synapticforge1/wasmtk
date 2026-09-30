// H12 sw05 (2026-09-30): a string argument to a call inside console.log that is not a plain
// variable or literal was passed as the empty string, silently: count(names[1]) printed 0.
// It is now built by wasic's string emitter; what nothing can build is a compile error.
type i32 = number;

interface Person {
  name: string;
  age: i32;
}

function count(s: string): i32 {
  return s.length;
}
function greet(s: string): string {
  return "hi " + s;
}
function same(a: string, b: string): boolean {
  return a === b;
}

const names: string[] = ["a", "bcd", "efgh"];
const p: Person = { name: "Ada", age: 36 };
const word: string = "hello";

console.log(count(names[1]));
console.log(count(p.name));
console.log(count(word.slice(1)));
console.log(count(greet(names[2])));
console.log(count(names[0]) + count(names[2]));
console.log("len:", count(word.toUpperCase()));
console.log(same(names[1], "bcd"));
console.log(names[1] === greet("x"));

function inner(xs: string[]): void {
  console.log(count(xs[2]), count(xs[0]));
}
inner(names);
