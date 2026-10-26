type i32 = number;
interface R {
  k: i32;
  id: i32;
}
const rs: R[] = [{ k: 3, id: 1 }, { k: 1, id: 2 }, { k: 3, id: 3 }, { k: 2, id: 4 }, { k: 1, id: 5 }];
rs.sort((a: R, b: R): i32 => a.k - b.k);
let o: string = "";
for (const r of rs) o += r.id;
const fs: number[] = [3.5, -1, 2.25, 10];
fs.sort((a: number, b: number): number => b - a);
console.log(o, fs.join(","));
