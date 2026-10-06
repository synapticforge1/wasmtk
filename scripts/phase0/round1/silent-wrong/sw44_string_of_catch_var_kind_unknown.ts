// A thrown STRING: String(e) is the string itself. wasic stores every caught value as its message
// and does not track what was thrown, so a declared String(e) always prefixes "Error: ".
function fail(): void { throw "custom"; }
try {
  fail();
} catch (e) {
  const m: string = String(e);
  console.log(m);
}
