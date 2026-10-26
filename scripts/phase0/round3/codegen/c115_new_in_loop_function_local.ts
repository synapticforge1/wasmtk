type i32 = number;
class Node1 {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
}
function collect(): i32 {
  let first: Node1 = new Node1(0);
  let last: Node1 = new Node1(0);
  for (let i = 1; i <= 3; i++) {
    const n: Node1 = new Node1(i);
    if (i === 1) first = n;
    last = n;
  }
  return first.v * 10 + last.v;
}
console.log(collect());
