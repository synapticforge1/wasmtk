// console.log(Boolean(a)) fails in the assembler (undefined func $Boolean); the declaration is
// refused with a reason ("Unknown function 'Boolean'").
type i32 = number;
const a: i32 = 7;
console.log(Boolean(a));
