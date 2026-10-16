type i32 = number; type f64 = number;
function main(): void {
  const arr: i32[] = [1, 2, 3];
  arr[0]++;
  arr[2]--;
  const a0: i32 = arr[0];
  const a2: i32 = arr[2];
  console.log(a0, a2);
}
main();
