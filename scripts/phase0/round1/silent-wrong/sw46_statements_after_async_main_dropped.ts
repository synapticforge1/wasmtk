// With an async main() in the file, every OTHER top-level statement is dropped, before the
// call as well as after it: only "in main" prints.
console.log("before main");
async function main(): Promise<void> {
  console.log("in main");
}
main();
console.log("after main");
