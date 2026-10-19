/**
 * Output paths that can never be the input file (sw113, 2026-10-15 audit round 2).
 *
 * Every command derived its default output by replacing the input's extension with a
 * case-sensitive, sometimes unanchored `String.replace`. When the extension did not match
 * (`lib.bin`, `libcopy.WASM`, `entry.mts`, `H2.WIT`, `calc.mjs`) the replace changed nothing, so the
 * "output" WAS the input and the command overwrote its own source, exiting 0: `jstyper calc.mjs`
 * left an empty file. `defaultOutPath` replaces a known extension in any case and otherwise
 * appends the new one; `assertNotInput` refuses any write that resolves to the input, an explicit
 * `-o` included.
 */
import { resolve } from "@std/path";

/** `input` with its extension (one of `from`, matched in any case, at the end) replaced by `to`;
 *  when none matches, `to` is APPENDED (`lib.bin` → `lib.bin.wat`), never the input itself. */
export function defaultOutPath(input: string, from: string[], to: string): string {
  const lower = input.toLowerCase();
  const ext = from.find((e) => lower.endsWith(e.toLowerCase()));
  return ext ? input.slice(0, input.length - ext.length) + to : input + to;
}

/** True when `a` and `b` name the same file (case-insensitively on Windows, as its file system). */
export function samePath(a: string, b: string): boolean {
  const ra = resolve(a), rb = resolve(b);
  return Deno.build.os === "windows" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
}

/** Throws when `out` is the input file: a command must never write over its own source. */
export function assertNotInput(input: string, out: string, command: string): void {
  if (samePath(input, out)) {
    throw new Error(
      `${command}: the output '${out}' is the input file; it would be overwritten. ` +
        `Pass -o <path> to choose another output.`,
    );
  }
}
