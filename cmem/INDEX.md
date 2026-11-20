# INDEX: wasmtk

Read STATE.md first. Open another file only when the task matches its line. Split files list their parts.

- `working-rules.md`: before the first command of a session; the rules and owner words
- `next-work.md`: when choosing the next item or picking one up (open items)
- `workflow.md`: before a batch, a fix, a binaryang bump or a release; the full gate
- `testing.md`: before running or adding tests; the impact map and counts
- `compiler-bugs.md`: before debugging; the open defects and the tally
- `design-decisions.md`: when a change touches codegen, a backend, the CLI or the release scripts
- `best-practices.md`: before an audit, a review or a bump; method lessons
- `best-practices-shared.md`: the workspace's ★ rules (a stamped copy, never edited here)
- `review-process.md`: only during a review
- `release.md`: only when releasing; the release history
- `platforms.md`: when touching src/host.ts or another OS; the support matrix
- `roadmap.md`: the unreleased block, phases, README roadmap conventions
- `overview.md`: repo layout and the key source files
- `architecture.md`: wasic, modc, bindgen, hybrid, the backend and merge pipeline
- `polyglot-producers.md`: Go, Zig and Rust producers
- `dynrt-design.md`: the dynamic runtime (`dync`)
- `async-design.md`: Promise and async
- `capabilities.md`: Set, Map, Date, JSON, RegExp libraries
- `stdlib-bundling-brief.md`: on-demand stdlib bundling
- `math-cr-sweep.md`: correctly rounded Math
- `wasm-number-types.md`, `wasm-math-plan.md`: wasMath and the declared-type rule
- `number-model-and-runtime-plan.md`: plain numbers and the Bun move (measured)
- `deno-exit-plan.md`: leaving Deno for Bun and Node
- `wasic-modularization-plan.md`: splitting src/wasic.ts (H12)
- `offload-inventory.md`: what binaryang, a runtime or a loader could own
- `vision.md`, `component-model-discussion.md`: long-range direction
- `archive/`: do not read unless the owner asks about past work; search by ID
- `local/`: machine facts; never given to a reviewer
