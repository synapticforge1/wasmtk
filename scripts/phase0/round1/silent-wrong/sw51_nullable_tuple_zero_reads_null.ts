type i32 = number; type f64 = number;
type NT = [i32 | null, f64];
function mk(): NT { return [0, 2.5]; }
function show(): void { const t: NT = mk(); const [v, r]: NT = t; console.log(v ?? -1, r); }
show();
