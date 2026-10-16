type i32 = number; type f64 = number;
interface In { z: f64 }
interface Out { inner: In | null }
const o2: Out = { inner: null };
const b: f64 = o2.inner?.z ?? -1;
console.log(b);
console.log(o2.inner?.z ?? -1);
