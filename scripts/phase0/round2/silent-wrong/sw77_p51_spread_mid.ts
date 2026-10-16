type i32 = number; type f64 = number;
const nums: i32[] = [4, 5, 6];
nums.push(0);
nums.pop();
const merged: i32[] = [0, ...nums, 7];
const ml: i32 = merged.length;
const m4: i32 = merged[4];
console.log(ml, m4);
