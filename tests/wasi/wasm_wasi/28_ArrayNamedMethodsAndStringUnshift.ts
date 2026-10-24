// sw129, sw130 (silent, found 2026-10-23; the same on main). sw129: a class method named `push`,
// called as a statement on an instance, was compiled as an ARRAY push onto the object's memory
// (`s.push(7)` printed `0 0` for `9 2`). sw130: `unshift` on a string array APPENDED (`a,b,c` was
// `b,c,a`): both string paths called the push helper.
type i32 = number;

class Stack {
  top: i32;
  count: i32;
  constructor() {
    this.top = 0;
    this.count = 0;
  }
  push(x: i32): void {
    this.top = x;
    this.count = this.count + 1;
  }
}
const s: Stack = new Stack();
s.push(7);
s.push(9);
console.log(s.top, s.count);

class Q {
  a: i32;
  b: i32;
  constructor() {
    this.a = 0;
    this.b = 0;
  }
  pop(): i32 {
    this.a = this.a + 1;
    return this.a;
  }
  shift(): i32 {
    this.b = this.b + 10;
    return this.b;
  }
  unshift(x: i32): void {
    this.a = this.a + x;
  }
}
const q: Q = new Q();
q.pop();
q.shift();
q.unshift(5);
const v: i32 = q.pop();
console.log(q.a, q.b, v);

const ws: string[] = ["b", "c"];
ws.unshift("a");
console.log(ws.join(","), ws.length);
const n: string = "z";
ws.unshift(`${n}!`);
console.log(ws[0], ws[1], ws.length);
const nums: i32[] = [2, 3];
nums.unshift(1);
console.log(nums.join(","));
