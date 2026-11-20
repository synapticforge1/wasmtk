/**
 * tests/host_tests.ts — src/host.ts directly (the review of 2026-11-20: hardening H2, H5, H15,
 * security S2). Each case names the finding it pins; every file it makes is in a temp folder that is
 * removed at the end.
 *
 *   deno run -A tests/host_tests.ts
 */
import { join } from "jsr:@std/path";
import { host, subprocessTimeoutMs } from "../src/host.ts";

let passed = 0, failed = 0;
const check = (name: string, ok: boolean, detail = ""): void => {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : `: ${detail}`}`);
};

const dir = await Deno.makeTempDir({ prefix: "wasmtk_host_" });
try {
  console.log("── every program wasmtk starts has a time limit (H2) ──");
  const sleeper = join(dir, "sleep.ts");
  await Deno.writeTextFile(sleeper, "await new Promise((r) => setTimeout(r, 30000));\n");
  {
    const t0 = Date.now();
    let msg = "";
    try {
      await new host.Command(host.execPath(), {
        args: ["run", sleeper],
        stdout: "null",
        stderr: "null",
        timeoutMs: 1500,
      })
        .output();
    } catch (e) {
      msg = (e as Error).message;
    }
    const took = Date.now() - t0;
    check(
      "output(): a hung program is stopped and named",
      /did not finish within 1\.5 s/.test(msg) && took < 15000,
      `${took} ms, "${msg}"`,
    );
  }
  {
    const t0 = Date.now();
    let msg = "";
    try {
      await new host.Command(host.execPath(), { args: ["run", sleeper], timeoutMs: 1500 }).spawn()
        .status;
    } catch (e) {
      msg = (e as Error).message;
    }
    const took = Date.now() - t0;
    check(
      "spawn(): a hung program is stopped and named",
      /did not finish within 1\.5 s/.test(msg) && took < 15000,
      `${took} ms, "${msg}"`,
    );
  }
  {
    const r = await new host.Command(host.execPath(), {
      args: ["--version"],
      stdout: "piped",
      timeoutMs: 60000,
    }).output();
    check("a program that finishes in time is unaffected", r.success, `exit ${r.code}`);
  }
  {
    const was = Deno.env.get("WASMTK_SUBPROCESS_TIMEOUT_S");
    try {
      Deno.env.delete("WASMTK_SUBPROCESS_TIMEOUT_S");
      const def = subprocessTimeoutMs();
      Deno.env.set("WASMTK_SUBPROCESS_TIMEOUT_S", "0");
      const none = subprocessTimeoutMs();
      Deno.env.set("WASMTK_SUBPROCESS_TIMEOUT_S", "soon");
      let bad = "";
      try {
        subprocessTimeoutMs();
      } catch (e) {
        bad = (e as Error).message;
      }
      check(
        "the limit: default 1800 s, 0 = none, a non-number refused",
        def === 1800_000 && none === 0 && /not a number of seconds/.test(bad),
        `${def} / ${none} / "${bad}"`,
      );
    } finally {
      if (was === undefined) Deno.env.delete("WASMTK_SUBPROCESS_TIMEOUT_S");
      else Deno.env.set("WASMTK_SUBPROCESS_TIMEOUT_S", was);
    }
  }
  console.log(
    "── writes: atomic, but never through a planted name, and links kept (H5, H15, S2) ──",
  );
  const listing = async (d: string) => {
    const n: string[] = [];
    for await (const e of Deno.readDir(d)) n.push(e.name);
    return n.sort();
  };
  {
    const d = join(dir, "long");
    await Deno.mkdir(d);
    const name = "n".repeat(240) + ".wasm"; // a legal 245-character name
    let err = "";
    try {
      await host.writeFile(join(d, name), new Uint8Array([1, 2, 3]));
    } catch (e) {
      err = (e as Error).message;
    }
    const back = err ? null : await Deno.readFile(join(d, name));
    check("a 245-character output name is written (H5)", back?.length === 3, err);
    check("…and no temporary file is left", (await listing(d)).join() === name);
  }
  {
    const d = join(dir, "hard");
    await Deno.mkdir(d);
    await Deno.writeTextFile(join(d, "real.wasm"), "OLD");
    await Deno.link(join(d, "real.wasm"), join(d, "hard.wasm"));
    await host.writeTextFile(join(d, "hard.wasm"), "NEW");
    check(
      "a hard-linked output is written in place: every name sees the new content (H15)",
      (await Deno.readTextFile(join(d, "real.wasm"))) === "NEW" &&
        (await Deno.readTextFile(join(d, "hard.wasm"))) === "NEW",
    );
  }
  {
    const d = join(dir, "sym");
    await Deno.mkdir(d);
    await Deno.writeTextFile(join(d, "real.wasm"), "OLD");
    let made = true;
    try {
      await Deno.symlink(join(d, "real.wasm"), join(d, "link.wasm"));
    } catch {
      made = false; // Windows without Developer Mode: no symlinks for this account
    }
    if (made) {
      await host.writeTextFile(join(d, "link.wasm"), "NEW");
      const isLink = (await Deno.lstat(join(d, "link.wasm"))).isSymlink;
      check(
        "a symlinked output is written THROUGH the link, which stays a link (H15)",
        isLink && (await Deno.readTextFile(join(d, "real.wasm"))) === "NEW",
      );
    } else {
      console.log("  – symlink case: this account may not create symlinks (not run)");
    }
  }
  {
    // S2: the temporary name is random, so nothing planted beside the output is ever written to
    const d = join(dir, "plant");
    await Deno.mkdir(d);
    const victim = join(dir, "victim.txt");
    await Deno.writeTextFile(victim, "ORIGINAL");
    // the OLD scheme's names for this process, around now: none of them may be touched
    for (let i = 0; i < 5; i++) {
      const old = `.out.wasm.wasmtk-${Deno.pid}-${(Date.now() + i).toString(36)}-${i}.tmp`;
      try {
        await Deno.symlink(victim, join(d, old));
      } catch {
        await Deno.writeTextFile(join(d, old), "PLANTED");
      }
    }
    await host.writeTextFile(join(d, "out.wasm"), "OUTPUT");
    check(
      "a file planted at a predictable temporary name is not written (S2)",
      (await Deno.readTextFile(victim)) === "ORIGINAL" &&
        (await Deno.readTextFile(join(d, "out.wasm"))) === "OUTPUT",
    );
  }
  console.log("── text inputs are UTF-8, or refused by name (H6, H7) ──");
  {
    const f16 = join(dir, "u16.wat");
    await Deno.writeFile(f16, new Uint8Array([0xff, 0xfe, 0x28, 0x00, 0x6d, 0x00]));
    const bad = join(dir, "bad.ts");
    await Deno.writeFile(bad, new Uint8Array([0x63, 0x6f, 0x6e, 0x73, 0x74, 0x20, 0xff, 0xfe]));
    const bom = join(dir, "bom.ts");
    await Deno.writeFile(bom, new Uint8Array([0xef, 0xbb, 0xbf, 0x31, 0xc3, 0xa9]));
    const msg = async (p: string) => {
      try {
        await host.readTextFile(p);
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    };
    check(
      "a UTF-16 file is refused, once, by name (H6)",
      /is UTF-16; save it as UTF-8/.test(await msg(f16)),
    );
    check(
      "invalid UTF-8 is refused with its offset (H7)",
      /not valid UTF-8 \(byte 6\)/.test(await msg(bad)),
    );
    check("a UTF-8 BOM is dropped and UTF-8 text read", (await host.readTextFile(bom)) === "1é");
  }

  console.log("── a launcher runs its command, whatever the folder is called (S1, H16) ──");
  {
    // A folder name a shell would expand: `%USERNAME%` for cmd, `$(…)` and a backtick for sh.
    const weird = Deno.build.os === "windows"
      ? "d%USERNAME%x a&b"
      : "x$(touch CANARY)y `touch CANARY2` q'r";
    const d = join(dir, weird);
    await Deno.mkdir(d, { recursive: true });
    const script = join(d, "echo.ts");
    await Deno.writeTextFile(script, `console.log("launched " + Deno.args.join(","));\n`);
    // The launcher lives in a plain folder (gowasic uses a fresh temp folder: cmd expands `%…%` in
    // a .cmd's OWN path); the folder name with shell syntax is in the command it runs.
    const ld = join(dir, "launchers");
    await Deno.mkdir(ld);
    const l = await host.writeLauncher(ld, "launch", [...host.scriptRunner(), script]);
    const r = await new host.Command(l, {
      args: ["a1", "b2"],
      stdout: "piped",
      stderr: "piped",
      cwd: dir,
    }).output();
    const out = new TextDecoder().decode(r.stdout).trim();
    let canary = false;
    for await (const e of Deno.readDir(dir)) if (e.name.startsWith("CANARY")) canary = true;
    check(
      "the launcher runs the script in a folder named with shell syntax, and runs nothing else",
      r.success && out === "launched a1,b2" && !canary,
      `exit ${r.code}, "${out}" ${new TextDecoder().decode(r.stderr).trim().slice(0, 120)}${
        canary ? " CANARY RAN" : ""
      }`,
    );
  }

  console.log("── the time limit holds when a grandchild keeps the pipes open (RH1) ──");
  {
    // a shell whose child sleeps 20 s: stopping only the shell left the wait open for 20 s
    const [cmd, args] = Deno.build.os === "windows"
      ? ["cmd", ["/c", "ping -n 20 127.0.0.1 >nul & echo x"]]
      : ["sh", ["-c", "sleep 20; echo x"]];
    const t0 = performance.now();
    let msg = "";
    try {
      await new host.Command(cmd, { args, stdout: "piped", stderr: "piped", timeoutMs: 1500 })
        .output();
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
    const s = (performance.now() - t0) / 1000;
    check(
      "a piped program with a long-running grandchild is stopped at the limit",
      msg.includes("did not finish within 1.5 s") && s < 6,
      `${s.toFixed(1)} s, "${msg.slice(0, 80)}"`,
    );
  }
  {
    // the child exits at once and leaves a background grandchild on the pipes: out of reach of a
    // tree kill, it kept the whole process alive for 20 s after the limit (re-review 2 of RH1)
    const [cmd, args] = Deno.build.os === "windows"
      ? ["cmd", ["/c", "start /b ping -n 20 127.0.0.1 >nul & exit 0"]]
      : ["sh", ["-c", "sleep 20 & exit 0"]];
    const probe = join(dir, "orphan.ts");
    await Deno.writeTextFile(
      probe,
      `import { host } from ${JSON.stringify(new URL("../src/host.ts", import.meta.url).href)};\n` +
        `try { await new host.Command(${JSON.stringify(cmd)}, { args: ${JSON.stringify(args)}, ` +
        `stdout: "piped", stderr: "piped", timeoutMs: 1500 }).output(); } catch { /* the limit */ }\n`,
    );
    const config = new URL("../deno.json", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
    const t0 = performance.now();
    await new Deno.Command("deno", { args: ["run", "-A", "--config", config, probe] }).output();
    const s = (performance.now() - t0) / 1000;
    check(
      "…and the process exits when the parent already left a grandchild on the pipes",
      s < 10,
      `${s.toFixed(1)} s`,
    );
    if (Deno.build.os === "windows") {
      await new Deno.Command("taskkill", {
        args: ["/F", "/IM", "PING.EXE"],
        stdout: "null",
        stderr: "null",
      })
        .output();
    }
  }
} finally {
  await Deno.remove(dir, { recursive: true });
}

console.log(`\n  host: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
