// Review B7 (2026-11-20): hex / octal / binary literals inside console.log. `a & 0xFF` was refused
// ("cannot emit the expression '0xFF'") and a bare `0xFF` among several arguments became an
// undefined local, though both worked outside console.log.
type i32 = number;

const a: i32 = 300;
console.log(a & 0xFF, a | 0x0F, a & 0xFFFFFFFF);
console.log(0xFF, 0b101, 0o17);
const m: i32 = a & 0xFF;
console.log(m);
function f(x: i32): void {
  console.log(x & 0x7F, x ^ 0b1);
}
f(255);
