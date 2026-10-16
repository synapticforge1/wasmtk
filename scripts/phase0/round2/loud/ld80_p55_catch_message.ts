type i32 = number; type f64 = number;
try {
  throw new Error("boom");
} catch (e) {
  const m: string = (e as Error).message;
  console.log(m);
}
