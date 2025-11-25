"use strict";
/**
 * internal.ts
 * ------------
 * This file holds **internal utilities** for the AI Reliability Layer.
 *
 * IMPORTANT:
 * ----------
 * Nothing in this file is part of the PUBLIC API.
 * Nothing here should ever be imported by end-users.
 *
 * This file exists ONLY for internal helpers that:
 *   • are needed across multiple core modules,
 *   • do not belong in utils/errors.ts,
 *   • should NOT pollute the public API surface,
 *   • should NOT be exposed or relied on outside this package.
 *
 * Think of `internal.ts` as the “private methods” of your library.
 * It is your **internal standard library**.
 *
 * WHAT THIS FILE WILL EVENTUALLY CONTAIN:
 * ----------------------------------------
 * Examples of things that belong in this file:
 *
 * 1. **assert() helper**
 *    - internal invariant checks
 *    - throws internal errors when something impossible happens
 *
 * 2. **isPromise()**
 *    - tiny helper the engine may need to normalize async vs sync steps
 *
 * 3. **normalizeError()**
 *    - turns ANY thrown value (string, object, unknown) into a real Error instance
 *
 * 4. **internal symbols or constants**
 *    - IDs used to tag internal state
 *    - reserved key names
 *
 * 5. **helper for safe execution**
 *    - wrappers that catch unexpected internal exceptions
 *    - used by engine.ts only
 *
 * These helpers are not useful to library consumers,
 * but ARE useful to keep engine/policies clean.
 *
 *
 * WHY THIS FILE EXISTS INSTEAD OF “utils/”:
 * -----------------------------------------
 * `utils/` contains helpers that ARE part of the public or semi-public layer
 * (like errors.ts, string helpers, type guards that may be used outside core).
 *
 * `internal.ts` contains helpers that MUST remain private.
 *
 * Keeping them separate allows:
 *   ✔ clean layering
 *   ✔ reduced surface area for the public API
 *   ✔ ability to change internals without breaking users
 *
 *
 * RELATIONSHIP TO OTHER FILES:
 * -----------------------------
 * - `core/engine.ts`
 *      Uses internal helpers for correctness checks, invariant enforcement,
 *      safe execution wrappers, error normalization, etc.
 *
 * - `core/policies.ts`
 *      May use internal helpers to keep retry/timeout logic concise.
 *
 * - `core/intent.ts`
 *      Might use internal asserts during config normalization.
 *
 * - `types/index.ts`
 *      Never imports internal — types remain clean and isolated.
 *
 * - `index.ts` (public API)
 *      NEVER exports anything from internal.ts.
 *
 *
 * FUTURE ROLE OF THIS FILE:
 * --------------------------
 * As the library grows, this file becomes the home for:
 *
 *   • DAG execution primitives (internal-only)
 *   • plan schedulers
 *   • execution-level metadata shims
 *   • safety guards for advanced reliability logic
 *   • backpressure / budget mechanisms
 *
 * None of these should ever become public — they are implementation details.
 *
 *
 * WHY INTERNALS MUST BE ISOLATED:
 * --------------------------------
 * Good OSS libraries separate:
 *
 *   PUBLIC ←→ STABLE  (src/index.ts)
 *   INTERNA*
*/ 
