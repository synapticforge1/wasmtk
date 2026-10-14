// Reference: Node / Deno util.inspect's array layout (groupArrayElements + reduceToSingleString),
// for a TOP-LEVEL console.log argument, checked against Deno.inspect on many arrays
// (check_inspect_array_ref.ts). `$__arr_inspect` in src/console_log.ts is its port (sw67); the
// string quoting and the padEnd order for non-numbers are here for ld37's writers.
export type Elem = number | string | boolean;

const quoteStr = (s: string): string => {
  const q = ['"', "'", "`"].find((c) => !s.includes(c)) ?? '"';
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === q) out += "\\" + q;
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch === "\v") out += "\\v";
    else if (c < 0x20 || c === 0x7f) out += "\\x" + c.toString(16).toUpperCase().padStart(2, "0");
    else out += ch;
  }
  return q + out + q;
};
const fmtElem = (v: Elem): string =>
  typeof v === "string" ? quoteStr(v) : typeof v === "number" ? (Object.is(v, -0) ? "-0" : String(v)) : String(v);

export function formatArray(values: Elem[]): string {
  if (values.length === 0) return "[]";
  const shown = Math.min(values.length, 100);
  const output = values.slice(0, shown).map(fmtElem);
  if (values.length > 100) {
    const r = values.length - 100;
    output.push(`... ${r} more item${r > 1 ? "s" : ""}`);
  }
  const entries = output.length;
  let out = output;
  if (entries > 6) out = group(output, values);
  if (entries === out.length) {
    const start = out.length + 0 + 1 + 0 + 10;
    let total = out.length + start;
    let below = total + out.length <= 80;
    for (const o of out) {
      if (!below) break;
      total += o.length;
      if (total > 80) below = false;
    }
    if (below) {
      const joined = out.join(", ");
      if (!joined.includes("\n")) return `[ ${joined} ]`;
    }
  }
  return `[\n  ${out.join(",\n  ")}\n]`;
}

function group(output: string[], value: Elem[]): string[] {
  let totalLength = 0, maxLength = 0;
  let outputLength = output.length;
  if (value.length > 100) outputLength--; // the "more items" entry
  const sep = 2;
  const dataLen: number[] = [];
  for (let i = 0; i < outputLength; i++) {
    const len = output[i].length;
    dataLen[i] = len;
    totalLength += len + sep;
    if (maxLength < len) maxLength = len;
  }
  const actualMax = maxLength + sep;
  if (actualMax * 3 + 0 < 80 && (totalLength / actualMax > 5 || maxLength <= 6)) {
    const averageBias = Math.sqrt(actualMax - totalLength / output.length);
    const biasedMax = Math.max(actualMax - 3 - averageBias, 1);
    const columns = Math.min(
      Math.round(Math.sqrt(2.5 * biasedMax * outputLength) / biasedMax),
      Math.floor((80 - 0) / actualMax),
      3 * 4,
      15,
    );
    if (columns <= 1) return output;
    const tmp: string[] = [];
    const maxLineLength: number[] = [];
    for (let i = 0; i < columns; i++) {
      let lineLength = 0;
      for (let j = i; j < output.length; j += columns) if (dataLen[j] > lineLength) lineLength = dataLen[j];
      maxLineLength.push(lineLength + sep);
    }
    const numeric = value.slice(0, output.length).every((v) => typeof v === "number");
    for (let i = 0; i < outputLength; i += columns) {
      const max = Math.min(i + columns, outputLength);
      let str = "";
      let j = i;
      for (; j < max - 1; j++) {
        const padding = maxLineLength[j - i];
        str += numeric ? `${output[j]}, `.padStart(padding, " ") : `${output[j]}, `.padEnd(padding, " ");
      }
      if (numeric) str += output[j].padStart(maxLineLength[j - i] - sep, " ");
      else str += output[j];
      tmp.push(str);
    }
    if (value.length > 100) tmp.push(output[outputLength]);
    return tmp;
  }
  return output;
}
