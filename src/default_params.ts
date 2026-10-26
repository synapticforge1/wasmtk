/**
 * default_params.ts — an omitted argument's default, bound to the call's earlier arguments (ld78,
 * 2026-10-22). Internal: used by wasic's call emitters and console_log's; not a package export.
 */

/**
 * The expression for an OMITTED argument `i`: its default, with every earlier parameter it reads
 * replaced by that parameter's argument (or, omitted too, by its own bound default). `b = a * 2`
 * read `a` in the CALLER's scope, where it does not exist. One pass, so an inserted argument is
 * never substituted again. `unsafe` names an argument with a side effect (a call, `++` / `--`, an
 * assignment) that the default would evaluate a second time; the caller refuses it.
 */
export function bindDefaultParam(
  params: Array<{ name?: string; defaultValue?: string }>,
  args: string[],
  i: number,
): { expr: string; unsafe: string | null } {
  const values: string[] = [];
  let unsafe: string | null = null;
  const bind = (d: string, n: number): string => {
    const names = params.slice(0, n).map((p) => p.name).filter((x): x is string => !!x);
    if (names.length === 0) return d;
    const re = new RegExp(
      `(?<![\\w$.])(${names.map((x) => x.replace(/\$/g, "\\$")).join("|")})(?![\\w$])`,
      "g",
    );
    return d.replace(re, (nm) => {
      const k = params.findIndex((p) => p.name === nm);
      const v = values[k] ?? nm;
      if (!unsafe && /\w\s*\(|\+\+|--|[^=!<>]=(?!=)/.test(v)) unsafe = v;
      // a plain name, number or member access as it is (a parenthesised literal has no type of
      // its own in an operation: `(1) * 2` was typed f64 for an i32 parameter)
      return /^[\w$.]+$/.test(v) ? v : `(${v})`;
    });
  };
  for (let k = 0; k <= i; k++) {
    values[k] = k < args.length ? args[k]!.trim() : bind(params[k]?.defaultValue ?? "0", k);
  }
  return { expr: values[i]!, unsafe };
}
