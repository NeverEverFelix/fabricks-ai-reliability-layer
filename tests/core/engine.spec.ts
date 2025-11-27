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


describe("runIntent – fallback behavior", () => {
  it("uses the fallback step when the primary step fails", async () => {
    const telemetryEvents: any[] = [];

    // Primary step: always throws
    const intent = defineIntent<{}, string>({
      name: "fallback-intent",
      steps: [
        {
          id: "primary",
          async run() {
            throw new Error("primary blew up");
          },
          // When primary fails, we should go to this fallback
          fallbackTo: "fallback",
        },
        {
          id: "fallback",
          async run() {
            return "fallback-output";
          },
        },
      ],
      entryStepId: "primary",
    });

    const result = await runIntent(intent, {
      input: {},
      telemetry: (event) => {
        telemetryEvents.push(event);
      },
    });

    // 1) Engine-level result should be success, with fallback output
    expect(result.success).toBe(true);
    expect(result.output).toBe("fallback-output");

    // 2) Telemetry expectations
    const primaryFinished = telemetryEvents.find(
      (e) => e.type === "step_finished" && e.stepId === "primary",
    );
    expect(primaryFinished).toBeDefined();
    expect(primaryFinished.success).toBe(false);

    const fallbackStarted = telemetryEvents.find(
      (e) => e.type === "step_started" && e.stepId === "fallback",
    );
    expect(fallbackStarted).toBeDefined();

    const fallbackFinished = telemetryEvents.find(
      (e) => e.type === "step_finished" && e.stepId === "fallback",
    );
    expect(fallbackFinished).toBeDefined();
    expect(fallbackFinished.success).toBe(true);

    const intentFinished = telemetryEvents.find(
      (e) => e.type === "intent_finished",
    );
    expect(intentFinished).toBeDefined();
    expect(intentFinished.success).toBe(true);
  });
});



// =====================================================
// NEW TEST — RETRY BEHAVIOR
// =====================================================

describe("runIntent – retry behavior", () => {
  it("retries a failing step and succeeds on a later attempt", async () => {
    const telemetryEvents: any[] = [];
    let callCount = 0;

    const intent = defineIntent<{}, string>({
      name: "retry-intent",
      steps: [
        {
          id: "primary",
          retry: { maxAttemps: 2 }, // adjust if your naming differs
          async run() {
            callCount++;
            if (callCount === 1) {
              throw new Error("first attempt boom");
            }
            return "ok-after-retry";
          },
        },
      ],
      entryStepId: "primary",
    });

    const result = await runIntent(intent, {
      input: {},
      telemetry: (event) => telemetryEvents.push(event),
    });

    // 1) Engine-level expectations
    expect(result.success).toBe(true);
    expect(result.output).toBe("ok-after-retry");
    expect(callCount).toBe(2);

    // 2) Telemetry expectations
    const retryStarted = telemetryEvents.filter(
      (e) => e.type === "retry_attempt_started",
    );
    const retryFailed = telemetryEvents.filter(
      (e) => e.type === "retry_attempt_failed",
    );

    // Attempt 1 + Attempt 2
    expect(retryStarted.length).toBe(2);

    // Only the first attempt should fail
    expect(retryFailed.length).toBe(1);

    // Final intent should be reported as success
    const intentFinished = telemetryEvents.find(
      (e) => e.type === "intent_finished",
    );
    expect(intentFinished).toBeDefined();
    expect(intentFinished.success).toBe(true);
  });
});



// =====================================================
// NEW TEST — TIMEOUT BEHAVIOR
// =====================================================

describe("runIntent – timeout behavior", () => {
  it("fails when a step exceeds timeoutMs and surfaces the timeout as a failed step + intent", async () => {
    const telemetryEvents: any[] = [];

    const intent = defineIntent<{}, string>({
      name: "timeout-intent",
      steps: [
        {
          id: "slow-step",
          timeoutMs: 10, // tiny timeout
          async run() {
            // Simulate a slow operation
            await new Promise((resolve) => setTimeout(resolve, 50));
            return "too-late";
          },
        },
      ],
      entryStepId: "slow-step",
    });

    const result = await runIntent(intent, {
      input: {},
      telemetry: (event) => telemetryEvents.push(event),
    });

    // 1) Engine should fail due to timeout
    expect(result.success).toBe(false);

    // 2) Final intent_finished should also show failure + error
    const intentFinished = telemetryEvents.find(
      (e) => e.type === "intent_finished",
    );
    expect(intentFinished).toBeDefined();
    expect(intentFinished.success).toBe(false);
    expect(intentFinished.error).toBeDefined();

    // 3) The step_finished event for slow-step should be marked as failed with an error
    const slowStepFinished = telemetryEvents.find(
      (e) => e.type === "step_finished" && e.stepId === "slow-step",
    );
    expect(slowStepFinished).toBeDefined();
    expect(slowStepFinished.success).toBe(false);
    expect(slowStepFinished.error).toBeDefined();

    // (Optional) if your TimeoutError has a recognizable message, you can assert on it:
    // expect(String(slowStepFinished.error.message || slowStepFinished.error))
    //   .toContain("timeout");
  });
});


// NEW TEST — MULTI-STEP LINEAR EXECUTION
// =====================================================

describe("runIntent – multi-step linear execution", () => {
  it("runs multiple steps in order and returns the last step's output", async () => {
    const telemetryEvents: any[] = [];
    const executionOrder: string[] = [];

    const intent = defineIntent<{}, string>({
      name: "two-step-intent",
      steps: [
        {
          id: "step-1",
          async run(ctx) {
            executionOrder.push("step-1");
            // can optionally stash something in metadata
            ctx.metadata = { ...(ctx.metadata || {}), fromStep1: "hello" };
            return "first";
          },
        },
        {
          id: "step-2",
          async run(ctx) {
            executionOrder.push("step-2");
            // see the metadata from step 1 is still there
            expect(ctx.metadata?.fromStep1).toBe("hello");
            return "second";
          },
        },
      ],
      entryStepId: "step-1",
    });

    const result = await runIntent(intent, {
      input: {},
      telemetry: (event) => telemetryEvents.push(event),
    });

    // 1) Engine should have run step-1 then step-2
    expect(executionOrder).toEqual(["step-1", "step-2"]);

    // 2) Final output should be from the last step
    expect(result.success).toBe(true);
    expect(result.output).toBe("second");

    // 3) Telemetry should show both steps in order
    const startedSteps = telemetryEvents
      .filter((e) => e.type === "step_started")
      .map((e) => e.stepId);
    const finishedSteps = telemetryEvents
      .filter((e) => e.type === "step_finished")
      .map((e) => e.stepId);

    expect(startedSteps).toEqual(["step-1", "step-2"]);
    expect(finishedSteps).toEqual(["step-1", "step-2"]);
  });
});
// =====================================================
// INTEGRATION-STYLE: PROVIDER USAGE
// =====================================================

describe("runIntent – integration with providers", () => {
  it("can call a provider from a step and return its result", async () => {
    const telemetryEvents: any[] = [];

    // Fake provider to stand in for OpenAI
    const fakeLLM = {
      async complete(prompt: string): Promise<string> {
        return `LLM: ${prompt.toUpperCase()}`;
      },
    };

    const intent = defineIntent<{ question: string }, string>({
      name: "llm-intent",
      steps: [
        {
          id: "prepare-prompt",
          async run(ctx) {
            const q = ctx.input.question;
            ctx.metadata = {
              ...(ctx.metadata || {}),
              prompt: `Answer this question clearly: ${q}`,
            };
            return "prepared";
          },
        },
        {
          id: "call-llm",
          async run(ctx) {
            const prompt = ctx.metadata?.prompt as string;
            const llm = ctx.providers?.llm as typeof fakeLLM;
            const answer = await llm.complete(prompt);
            return answer;
          },
        },
      ],
      entryStepId: "prepare-prompt",
    });

    const result = await runIntent(intent, {
      input: { question: "what is reliability?" },
      providers: { llm: fakeLLM },
      telemetry: (event) => telemetryEvents.push(event),
    });

    // Engine result
    expect(result.success).toBe(true);
    expect(result.output).toBe(
      'LLM: ANSWER THIS QUESTION CLEARLY: WHAT IS RELIABILITY?',
    );

    // Ensure both steps actually ran
    const startedSteps = telemetryEvents
      .filter((e) => e.type === "step_started")
      .map((e) => e.stepId);
    expect(startedSteps).toEqual(["prepare-prompt", "call-llm"]);
  });
});
