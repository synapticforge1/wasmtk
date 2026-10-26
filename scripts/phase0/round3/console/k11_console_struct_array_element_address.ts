// console.log of an object that is not a NAME or a call — a struct-array ELEMENT (`ps[1]`,
// `ks[0]` of a class array) or a nested struct FIELD (`q.pt`) — prints its address.
// The whole array and a struct variable print as Deno.
type i32 = number;
interface P { n: i32 }
const ps: P[] = [{ n: 1 }, { n: 2 }];
console.log(ps[1]);
