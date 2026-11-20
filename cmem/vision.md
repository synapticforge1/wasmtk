# The Polyglot WASM Ecosystem — Project Scope

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 3.** The sections continue in:

- [vision-2.md](vision-2.md): from "Projects"
- [vision-3.md](vision-3.md): from "Phased Roadmap"

## Vision Statement

Build a polyglot application development ecosystem where WebAssembly is the universal
binary format and WIT is the universal interface contract. Any language compiles to a
WASM component. Components compose into complete applications regardless of source
language. A single project management tool — built on pixi — orchestrates the entire
build pipeline. A family of language-specific loaders, all following a common
specification with TypeScript as the reference implementation, enables consuming
components from any host language. The result is a system where language choice is an
implementation detail, not an architectural constraint — and where replacing a Python
prototype with a Rust production implementation is a one-line manifest change.

---

## Guiding Principles

1. **WIT is the universal interface contract.** The WIT file is what components agree
   on. The language behind a component is an implementation detail invisible to
   everything else.

2. **The Canonical ABI is the transport standard.** All components follow the WASM
   Component Model Canonical ABI for type encoding. This gives native interop with the
   entire Bytecode Alliance ecosystem at no extra cost.

3. **TypeScript is the reference implementation.** The universalWasmLoader JS/TS
   implementation defines the interface, behavior, and test suite that all language
   ports must match. Build the reference first; ports follow.

4. **pixi manages environments. wasmtk manages WASM intelligence.** pixi installs
   toolchains, manages packages, and runs tasks. wasmtk knows what to build, how to
   wire it, and how to validate the WASM/WIT layer. Neither reimplements the other.

5. **Progressive porting is a first-class workflow.** Swapping one language
   implementation for another behind the same WIT interface must be a safe, validated,
   low-friction operation — not an afterthought.

6. **No lock-in.** Any component built to the Canonical ABI and accompanied by a WIT
   file is a valid participant in the system, regardless of what compiled it.

---

## The Ecosystem Map

```text
┌─────────────────────────────────────────────────────────────┐
│                    POLYGLOT BUILD LAYER                     │
│              (pixi foundation + wasmtk orchestration)       │
│   wasmtk build │ wasmtk compose │ wasmtk setup │ wasmtk port│
└─────────────────────────────────────────────────────────────┘
         ↓               ↓               ↓              ↓
┌─────────────────────────────────────────────────────────────┐
│                   LANGUAGE COMPILER LAYER                   │
│  wasic(TS) │ cargo-component(Rust) │ componentize-py(Python)│
│  TinyGo(Go) │ zig(Zig) │ ...                               │
└─────────────────────────────────────────────────────────────┘
         ↓               ↓               ↓              ↓
┌─────────────────────────────────────────────────────────────┐
│                  WASM COMPONENT LAYER                       │
│         component.wasm + component.wit (per component)      │
│              wasm-tools compose → app.wasm                  │
└─────────────────────────────────────────────────────────────┘
         ↓               ↓               ↓              ↓
┌─────────────────────────────────────────────────────────────┐
│                   HOST RUNTIME LAYER                        │
│  universalWasmLoader(JS/TS) │ loader-rs │ loader-py         │
│  loader-go │ loader-jvm │ loader-c(header)                 │
│         (all implement the UniversalWasmLoader Spec)        │
└─────────────────────────────────────────────────────────────┘
```

---

