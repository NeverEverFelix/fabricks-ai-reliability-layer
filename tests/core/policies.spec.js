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
import { describe, it, expect } from "vitest";
// Match the same style/path you use in engine.spec.ts
import { runWithRetry, runWithTimeout, TimeOutError, RetryExhaustedError } from "../../src/core/policies";
describe("runWithRetry", () => {
    it("executes the function once and returns its result when no policy is provided", async () => {
        let callCount = 0;
        const fn = async () => {
            callCount += 1;
            return "ok";
        };
        const result = await runWithRetry(fn); // no policy passed
        expect(result).toBe("ok");
        expect(callCount).toBe(1); // only called once, no retries without policy
    });
    it("propagates errors from the wrapped function when it throws", async () => {
        let callCount = 0;
        const alwaysFail = async () => {
            callCount += 1;
            throw new Error("boom");
        };
        await expect(runWithRetry(alwaysFail)).rejects.toThrow("boom");
        // still only one attempt in the no-policy case
        expect(callCount).toBe(1);
    });
});
describe("runWithTimeout", () => {
    it("resolves if the function finishes before the timeout", async () => {
        const fast = async () => {
            return "fast";
        };
        const result = await runWithTimeout(fast, 50); // 50ms timeout
        expect(result).toBe("fast");
    });
    it("rejects if the function does not finish before the timeout", async () => {
        const slow = async () => new Promise((resolve) => {
            setTimeout(() => resolve("too late"), 50);
        });
        await expect(runWithTimeout(slow, 10)).rejects.toThrow();
    });
});
describe("runWithTimeout", () => {
    // your existing tests:
    // - resolves if the function finishes before the timeout
    // - rejects if the function does not finish before the timeout
    it("rejects with a TimeOutError when the function exceeds the timeout", async () => {
        const slow = async () => new Promise((resolve) => {
            setTimeout(() => resolve("too late"), 50);
        });
        await expect(runWithTimeout(slow, 10)).rejects.toBeInstanceOf(TimeOutError);
    });
    it("propagates the original error when the function fails before the timeout", async () => {
        const failing = async () => {
            throw new Error("boom");
        };
        await expect(runWithTimeout(failing, 1000)).rejects.toThrow("boom");
    });
});
it("throws RetryExhaustedError when all retry attempts fail", async () => {
    let callCount = 0;
    const alwaysFail = async () => {
        callCount += 1;
        throw new Error("boom");
    };
    await expect(runWithRetry(alwaysFail, undefined, // telemetry
    "retry-intent", // intentName
    "step-1", // stepId
    { maxAttemps: 3 })).rejects.toBeInstanceOf(RetryExhaustedError);
    expect(callCount).toBe(3);
});
