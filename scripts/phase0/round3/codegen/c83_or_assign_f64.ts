type f64 = number;
let w: f64 = 0;
w ||= 2.5;
let v: f64 = 0.5;
v &&= 4;
console.log(w, v);
