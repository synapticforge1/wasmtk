// A long console.log line of f64s corrupts a LATER line's literal text: the second line prints
// fragments of the first ("6 1.4142135623730951" / ".6 0.7071067811865476 8.8"). Each line alone
// prints correctly. Suspected: the console scratch buffer overlaps the data where later lines'
// pre-rendered literal text lives.
console.log(Math.E, Math.LN10, Math.LN2, Math.LOG10E, Math.LOG2E, Math.PI, Math.SQRT1_2, Math.SQRT2);
console.log(1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 0.7071067811865476, 8.8);
