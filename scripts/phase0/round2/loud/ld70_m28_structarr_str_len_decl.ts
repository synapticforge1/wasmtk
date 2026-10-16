type i32 = number; type f64 = number;
interface U { name: string }
const users: U[] = [{ name: "ann" }, { name: "bo" }];
console.log(users[0].name.length);
const b: i32 = users[0].name.length;
console.log(b);
