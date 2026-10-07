// sw44 (2026-10-06): a caught value knows WHAT was thrown. wasic used to keep only the message, so
// `String(e)` always prefixed "Error: " in a declaration (wrong for a thrown string) and never in a
// console argument (wrong for a thrown Error), and `e instanceof Error` was true at compile time.
// Now: `String(e)`, `${e}` and `"x" + e` follow Error.prototype.toString (`Name: message`, `Name`
// for an empty message, the value itself for a thrown string or number); `instanceof` is a
// run-time test; a re-throw and an awaited rejection keep the kind.

function failString(): void {
  throw "custom";
}
function failError(): void {
  throw new Error("boom");
}
function failType(): void {
  throw new TypeError("bad type");
}
function failEmpty(): void {
  throw new RangeError("");
}
function failNum(): void {
  throw 42;
}

function show(label: string, f: () => void): void {
  try {
    f();
  } catch (e) {
    const s: string = String(e);
    console.log(label, s, String(e));
    console.log(label, e instanceof Error, e instanceof TypeError, e instanceof RangeError);
    const m: string = e instanceof Error ? e.message : "not an error";
    const m2: string = e instanceof Error ? e.message : String(e);
    console.log(label, m, m2);
    console.log(`${label} tmpl ${e}`);
    console.log(label + " cat " + e);
    const t: string = `t=${e}`;
    console.log(t);
  }
}
show("str", failString);
show("err", failError);
show("type", failType);
show("empty", failEmpty);
show("num", failNum);

function rethrow(): void {
  try {
    failType();
  } catch (e) {
    throw e;
  }
}
try {
  rethrow();
} catch (e) {
  console.log("rethrown", String(e), e instanceof TypeError);
}

try {
  try {
    failString();
  } catch (inner) {
    failError();
  }
} catch (outer) {
  console.log("outer", String(outer));
}
// The awaited-rejection case is 15_ThrownKindAsync.ts: with an async main() in the file, every
// other top-level statement is dropped (sw46, open).
