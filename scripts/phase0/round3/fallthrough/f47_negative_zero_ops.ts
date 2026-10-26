type i32 = number; type f64 = number;
const z: f64 = -0;
console.log(Object.is(z, -0), 1 / z, z === 0);
