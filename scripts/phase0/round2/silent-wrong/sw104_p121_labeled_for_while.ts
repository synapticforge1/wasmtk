type i32 = number; type f64 = number;
let hits: i32 = 0;
outer: for (let i: i32 = 0; i < 3; i++) {
  let j: i32 = 0;
  while (j < 5) {
    j++;
    if (j === 2) continue outer;
    hits++;
  }
}
console.log(hits);
