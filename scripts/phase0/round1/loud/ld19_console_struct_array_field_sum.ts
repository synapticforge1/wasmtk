type f64 = number;
interface P { x: f64; }
const qs: P[] = [{ x: 1.5 }, { x: 2.5 }];
console.log(qs[0].x + qs[1].x);
