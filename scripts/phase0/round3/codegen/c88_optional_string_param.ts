function greet(name?: string): string {
  if (name === undefined) return "anon";
  return "hi " + name;
}
const a: string = greet();
const b: string = greet("");
const c: string = greet("x");
console.log(a, "[" + b + "]", c);
