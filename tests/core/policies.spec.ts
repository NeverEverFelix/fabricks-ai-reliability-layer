/**
 * policies.spec.ts
 * ------------------
 * This file contains the unit tests for the **reliability policy primitives**
 * defined in policies.ts.
 *
 * PURPOSE OF THIS TEST FILE:
 * ---------------------------
 * While engine.spec.ts tests full workflow behavior,
 * policies.spec.ts tests the **individual reliability mechanisms** in isolation:
 *
 *    - Retry behavior
 *    - Timeout behavior
 *    - Fallback behavior
 *
 * These tests ensure that each policy wrapper (withRetry, withTimeout, withFallback)
 * behaves deterministically and correctly before being composed inside engine.ts.
 *
 * WHY IS THIS IMPORTANT?
 * -----------------------
 * The policies layer is where the reliability guarantees come from.
 *
 * If policies are incorrect:
 *    • retry might run too many times
 *    • retry might not run at all
 *    • timeouts might never trigger
 *    • fallbacks might misfire or loop
 *
 * Testing these in isolation ensures the engine’s behavior is solid and predictable.
 *
 *
 * WHAT THESE TESTS WILL EVENTUALLY COVER:
 * ----------------------------------------
 *
 * 1. **Retry behavior**
 *    - Step should retry until success.
 *    - Step should retry only up to maxAttempts.
 *    - Each attempt should call the run function.
 *    - Retry should stop immediately if an attempt succeeds.
 *    - Retry should propagate the final error if all attempts fail.
 *
 * 2. **Retry backoff (future)**
 *    - backoff function should be called per attempt.
 *    - delays should be respected (using fake timers).
 *
 * 3. **Timeout behavior**
 *    - Step should fail if it exceeds the timeoutMs.
 *    - TimeoutError should be thrown.
 *    - If step finishes within time, result should be returned normally.
 *    - Using fake timers ensures deterministic testing.
 *
 * 4. **Fallback behavior**
 *    - If primary succeeds, fallback should NOT run.
 *    - If primary fails, fallback must run.
 *    - If both fail, final error must come from fallback.
 *    - Fallback should receive the same context.
 *
 * 5. **Interoperability**
 *    - Combine retry + timeout and ensure correct order.
 *    - Combine retry + fallback.
 *    - Ensure that retry does NOT mask fallback behavior.
 *
 * 6. **Error normalization**
 *    - Policies should wrap thrown values consistently.
 *    - Tests ensure thrown strings/unknowns become real Error objects (future internal.ts helper).
 *
 *
 * TEST STRATEGY (WHEN IMPLEMENTED LATER):
 * ----------------------------------------
 *
 * • Use fake step functions with counters:
 *
 *    let attempts = 0;
 *    const fn = () => {
 *       attempts++;
 *       if (attempts < 3) throw new Error("fail");
 *       return "ok";
 *    };
 *
 * • Use fake timers for timeout tests.
 * • Avoid the engine — test policies in isolation for clarity and determinism.
 *
 *
 * WHAT THIS TEST FILE *WILL NOT* COVER:
 * --------------------------------------
 * - Execution order → engine.spec.ts
 * - Intent definition validation → intent.spec.ts
 * - Telemetry event emission → telemetry.spec.ts
 * - Provider I/O → providers/openai.spec.ts
 *
 * policies.spec.ts ONLY tests the *mechanisms* of reliability.
 *
 *
 * WHY THIS IS A SEPARATE TEST FILE:
 * -----------------------------------
 * We isolate these tests because:
 *
 *    ✔ makes failure debugging easier (unit-level, not system-level)
 *    ✔ ensures each policy works independently before integrating with engine.ts
 *    ✔ avoids masking engine bugs with policy bugs and vice versa
 *
 *
 * FUTURE EVOLUTION OF THIS FILE:
 * -------------------------------
 * As policies.ts grows, this test file grows to match:
 *
 *    • exponential backoff testing
 *    • jitter (randomized backoff) testing
 *    • conditional retry testing (retry only on TimeoutError, etc.)
 *    • circuit breaker testing
 *    • cascading fallback testing
 *
 *
 * SUMMARY:
 * --------
 * policies.spec.ts ensures your reliability primitives are:
 *
 *    • correct
 *    • deterministic
 *    • predictable
 *    • safe to compose
 *
 * With good tests here, the reliability layer becomes mathematically correct,
 * and engine.ts becomes easier to reason about and maintain.
 */
