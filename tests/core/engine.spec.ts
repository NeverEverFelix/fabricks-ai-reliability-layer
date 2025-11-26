/**
 * engine.spec.ts
 * ----------------
 * This file will contain the unit tests for the **execution engine**
 * (the runtime core defined in engine.ts).
 *
 * PURPOSE OF THIS TEST FILE:
 * ---------------------------
 * While intent.spec.ts ensures that intent definitions are valid,
 * engine.spec.ts ensures that the **behavior** of executing those
 * intents is correct, deterministic, and reliable.
 *
 * These tests verify that the engine:
 *   • runs steps in the correct order,
 *   • handles errors properly,
 *   • respects retry, timeout, and fallback policies,
 *   • emits telemetry events at the right times,
 *   • returns the correct ExecutionResult object.
 *
 * This is the MOST CRITICAL test file for the entire library.
 * It proves that the engine behaves exactly as your reliability model promises.
 *
 *
 * WHAT THESE TESTS WILL EVENTUALLY COVER:
 * ----------------------------------------
 *
 * 1. **Basic step execution**
 *    - A simple linear intent with 1–3 steps should run in order.
 *    - Engine should return the output of the final step.
 *
 * 2. **ExecutionContext passing**
 *    - ctx.input should be available inside each step's run() function.
 *    - Providers should be accessible inside ctx.providers.
 *
 * 3. **Error handling**
 *    - If a step throws, the engine should capture the error.
 *    - ExecutionResult.success = false.
 *    - Execution stops unless a fallback is available.
 *
 * 4. **Fallback routing**
 *    - When a step fails and defines fallbackTo, engine must jump to the fallback step.
 *    - Test that fallback steps can succeed OR fail.
 *    - Test that fallback chains behave correctly.
 *
 * 5. **Retry behavior**
 *    - Steps with retry policies should re-run upon failure.
 *    - Test maxAttempts behavior.
 *    - Test that only specific attempts fail or succeed.
 *
 * 6. **Timeout behavior**
 *    - Steps with timeoutMs should fail if execution exceeds the limit.
 *    - Ensure that timeout errors propagate correctly as TimeoutError.
 *
 * 7. **Telemetry emission**
 *    - Every execution should produce a proper event trace.
 *    - The order must be:
 *         intent_started → step_started → step_finished → ... → intent_finished
 *    - Failed steps should emit step_failed.
 *    - Fallback routing should appear clearly in the event sequence.
 *
 * 8. **ExecutionResult structure**
 *    Ensure that:
 *      - `success` is correct.
 *      - `output` contains the last successful step result.
 *      - `error` contains the thrown error for failed runs.
 *      - `trace` contains the telemetry events.
 *
 * 9. **Step ordering rules**
 *    - Engine should NEVER skip steps unless fallbackTo is triggered.
 *    - Should identify next step purely from intent definition.
 *
 * 10. **Isolation**
 *     - Running the same intent twice should produce predictable behavior.
 *     - Engine must not mutate the intent definition or context.
 *
 *
 * WHAT THIS TEST FILE *WILL NOT* COVER:
 * --------------------------------------
 * - Intent config validation → intent.spec.ts
 * - Retry/timeout algorithms in isolation → policies.spec.ts
 * - Telemetry sink integration → telemetry.spec.ts
 * - Provider wrappers → providers/openai.spec.ts
 *
 * engine.spec.ts ONLY verifies **orchestration correctness**.
 *
 *
 * TEST STRATEGY (when implemented later):
 * ----------------------------------------
 *
 * For most tests you will use:
 *    - Fake step functions (sync or async)
 *    - Fake providers (simple mock objects)
 *    - Simple intents defined via defineIntent
 *
 * Example fake steps:
 *    { id: "A", run: () => 1 }
 *    { id: "B", run: () => "ok" }
 *    { id: "C", run: () => { throw new Error("fail") } }
 *
 * Avoid:
 *    X real network calls
 *    X real OpenAI providers
 *    X complicated workflows
 *
 * This ensures tests are deterministic and extremely fast.
 *
 *
 * WHY THIS TEST FILE IS CRITICAL:
 * --------------------------------
 * The engine is literally the:
 *
 *      HEART + BRAIN
 *
 * of the entire reliability layer.
 *
 * If engine.ts has bugs:
 *    - Workflows produce the wrong output
 *    - Telemetry traces become unreliable
 *    - Retry/timeout policies break
 *    - Intent definition correctness becomes meaningless
 *
 * With strong engine tests:
 *    ✔ Reliability is guaranteed
 *    ✔ Behavior is predictable
 *    ✔ Debugging becomes trivial
 *    ✔ You get real production-grade confidence
 *
 *
 * SUMMARY:
 * --------
 * engine.spec.ts is the test suite that proves your orchestration engine works.
 *
 * It validates:
 *    • execution ordering
 *    • fallback/routing logic
 *    • policy application
 *    • telemetry correctness
 *    • result shaping
 *
 * This is one of the MOST important files in your entire codebase.
 */
// tests/engine.spec.ts

/**
 * See big header comment above for why this file matters.
 * Below are the first two concrete tests for the engine.
 */

import { describe, it, expect } from "vitest";
import { defineIntent } from "../../src/core/intent";
import { runIntent } from "../../src/core/engine";
import type { TelemetryEvent } from "../../src/types";
import type { TelemetrySink } from "../../src/types";


describe("runIntent – retry behavior", () => {
  it("retries a failing step and eventually succeeds", async () => {
    const events: TelemetryEvent[] = [];
    const telemetry: TelemetrySink = (e) => {
      events.push(e);
    };

    let callCount = 0;

    const intent = defineIntent({
      name: "retry-intent",
      steps: [
        {
          id: "primary",
          async run() {
            callCount += 1;
            if (callCount === 1) {
              // first attempt fails
              throw new Error("boom");
            }
            // second attempt succeeds
            return "ok-after-retry";
          },
          // ✅ IMPORTANT: correct property name and >1 attempts
          retry: {
            maxAttemps: 2,
          },
        },
      ],
    });

    const result = await runIntent(intent, {
      input: {},
      telemetry,
    });

    // 1) Engine should report success because retry eventually worked
    expect(result.success).toBe(true);
    expect(result.output).toBe("ok-after-retry");
    expect(callCount).toBe(2); // 1 fail + 1 success

    // 2) Telemetry expectations
    const types = events.map((e) => e.type);

    const retryFailedEvents = events.filter(
      (e): e is TelemetryEvent & { type: "retry_attempt_failed"; attempt: number } =>
        e.type === "retry_attempt_failed"
    );
    const stepFailedEvents = events.filter(
      (e): e is TelemetryEvent & { type: "step_finished"; success: false } =>
        e.type === "step_finished" && e.success === false
    );
    
    expect(retryFailedEvents.length).toBe(1);
    expect(retryFailedEvents[0].attempt).toBe(1);
    

    // Only the first attempt should have failed at the retry layer
    expect(retryFailedEvents.length).toBe(1);
    expect(retryFailedEvents[0].attempt).toBe(1);

    // Because the step eventually succeeded, there should be no final step_failed
    expect(stepFailedEvents.length).toBe(0);

    // And we should still have a final intent_finished
    expect(types[0]).toBe("intent_started");
    expect(types[types.length - 1]).toBe("intent_finished");
  });
});