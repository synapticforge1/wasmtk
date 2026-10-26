type i32 = number;
interface P {
  x: i32;
  y: i32;
}
interface L {
  a: P;
  b: P;
}
const l: L = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } };
l.b.y = 50;
l.a.x += 7;
const s: i32 = l.a.x + l.b.y;
console.log(l.a.x, l.a.y, l.b.x, l.b.y, s);
