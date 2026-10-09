type i32 = number;
function main(): void { const ints: i32[] = [4, 5]; const s: string = `${ints.join("-")}|`; console.log(s); }
main();
