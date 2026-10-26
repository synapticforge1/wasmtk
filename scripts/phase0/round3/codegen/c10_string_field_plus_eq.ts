interface P {
  s: string;
}
const p: P = { s: "a" };
p.s += "bc";
console.log(p.s);
