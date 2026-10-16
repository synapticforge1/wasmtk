const b: f64[] = [0.5, 0.25, 0.75];
b.sort((x: f64, y: f64): f64 => x - y);
console.log(b.join(","));
