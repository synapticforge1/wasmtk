type i32 = number;
function reader() {
  let r: i32 = 5;
  const g: () => i32 = () => r * 2;
  return { g: g };
}
const rd: { g: () => i32 } = reader();
console.log(rd.g());
