type i32 = number;
const parts: string[] = "a,b,,c,".split(",");
const v: string = parts.join("|");
const n: i32 = parts.length;
const w: string = "abcabc".lastIndexOf("bc") + ":" + "abc".indexOf("", 10);
console.log(v, n, w);
