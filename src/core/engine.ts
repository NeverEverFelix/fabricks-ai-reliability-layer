/**
 * engine.ts
 * ----------
 * This is the **execution engine** of the entire AI Reliability Layer.
 *
 * PURPOSE OF THIS FILE (HIGH-LEVEL):
 * ----------------------------------
 * - The engine is responsible for **actually running an intent**, step by step.
 * - While "intent.ts" handles configuration & validation, the engine handles **execution**.
 * - It takes a validated IntentDefinition and an ExecutionContext and produces
 *   an ExecutionResult (success, failure, output, trace of telemetry events).
 *
 * WHAT THE ENGINE DOES (MENTALLY):
 * --------------------------------
 * Think of the intent as a small workflow graph:
 *
 *    step1 → step2 → step3
 *         ↘ fallback
 *
 * The engine:
 * - Starts at the intent's entry step.
 * - For each step:
 *      1. Emits telemetry: "step_started".
 *      2. Applies reliability policies:
 *           - retry
 *           - timeout
 *           - fallback redirection
 *      3. Runs the step’s `run(ctx)` function.
 *      4. Emits telemetry: "step_succeeded" or "step_failed".
 * - Moves to the next step or fallback step.
 * - Stops when:
 *      - we hit the last step,
 *      - or a fatal error occurs with no fallback available.
 *
 * WHAT THIS FILE WILL CONTAIN (BUT NOT IMPLEMENT YET):
 * -----------------------------------------------------
 * - A single public function: `runIntent(intent, ctx)`
 * - Internally:
 *      - `executeStep(stepConfig, ctx)` — handles retry/timeout/fallback wrapper.
 *      - `emitTelemetryEvent(ctx, event)` — hooks into telemetry.ts.
 *      - Logic for:
 *          - advancing from one step to the next,
 *          - switching to fallback steps,
 *          - catching and wrapping errors.
 *
 * THE ENGINE'S ROLE IN THE LARGER SYSTEM:
 * ----------------------------------------
 * This file is the **runtime core** of the whole library.
 *
 * - `intent.ts` is the compiler.
 * - `engine.ts` is the VM / interpreter.
 * - `policies.ts` is the reliability layer (decorators for retry, timeout, fallback).
 * - `telemetry.ts` is the observability layer.
 * - Providers (e.g., OpenAI, Anthropic) are plugged into ctx.providers and
 *   used *inside* step.run.
 *
 * RIGHT NOW (MVP STAGE):
 * -----------------------
 * The engine executes:
 *  • Linear step sequences
 *  • Optional fallback routing
 *  • Retry/timeouts around steps
 *  • Telemetry events for observability
 *
 * LATER (FUTURE ROADMAP):
 * ------------------------
 * This file becomes the foundation for:
 *
 * 1. **Full DAG execution**
 *    - Parallel branches
 *    - Dependencies (run B only after A finishes)
 *    - Future "graph planner"
 *
 * 2. **Streaming execution**
 *    - Pipe streaming LLM output into next step
 *
 * 3. **Advanced reliability**
 *    - Circuit breakers
 *    - Retry budget tracking
 *    - Success rate adaptive fallback
 *
 * 4. **Execution-level tracing**
 *    - Full OpenTelemetry integration
 *    - Distributed tracing (span per step)
 *
 * 5. **Pluggable schedulers**
 *    - Running intents across threads or worker pools
 *
 * WHY THIS FILE IS CRITICALLY IMPORTANT:
 * --------------------------------------
 * This is the “brain” of the reliability layer.
 *
 * - All reliability guarantees come from here.
 * - This is where you demonstrate engineering skill to hiring managers.
 * - This is where execution order, correctness, and guarantees are enforced.
 *
 * In other words:
 *    **intent.ts defines WHAT should happen**
 *    **engine.ts defines HOW it happens**
 *
 * You will implement this AFTER all comments are done for each file
 * so the architecture remains extremely clean and intentional.
 */

import type {
    Intent,
    ExecutionContext,
    ExecutionResult,
    TelemetryEvent,
    StepConfig,
    StepId,
  } from "../types";
  import { RetryPolicy, runWithRetry, runWithTimeout } from "./policies";
  import { TelemetrySink } from "./telemetry";

  export async function runIntent<Input, Output>(
    intent: Intent<Input, Output>,
    ctx: ExecutionContext<Input>
  ): Promise<ExecutionResult<Output>> {
    const trace: TelemetryEvent[] = [];
    const { name, steps } = intent;
  
    const now = () => Date.now();
  
    // 1. No steps = fail fast
    if (!steps || steps.length === 0) {
      const error = new Error(`Intent "${name}" has no steps defined.`);
  
      trace.push({
        type: "intent_started",
        intentName: name,
        timestamp: now(),
      });
  
      trace.push({
        type: "intent_finished",
        intentName: name,
        timestamp: now(),
        success: false,
        error,
      });
  
      return {
        intentName: name,
        success: false,
        error,
        trace,
      };
    }
  
    // 2. Resolve entry step
    const entryStepId: StepId | undefined = intent.entryStepId;
    let stepToRun: StepConfig<Input, Output>;
  
    if (entryStepId) {
      const found = steps.find((step) => step.id === entryStepId);
  
      if (!found) {
        const error = new Error(
          `entryStepId "${entryStepId}" does not match any step id.`
        );
  
        trace.push({
          type: "intent_started",
          intentName: name,
          timestamp: now(),
        });
  
        trace.push({
          type: "intent_finished",
          intentName: name,
          timestamp: now(),
          success: false,
          error,
        });
  
        return {
          intentName: name,
          success: false,
          error,
          trace,
        };
      }
  
      stepToRun = found;
    } else {
      stepToRun = steps[0];
    }
  
    // 3. Telemetry: start intent + primary step
    trace.push({
      type: "intent_started",
      intentName: name,
      timestamp: now(),
    });
  
    trace.push({
      type: "step_started",
      intentName: name,
      stepId: stepToRun.id,
      timestamp: now(),
    });
  
    // 4. Run primary step with retry + timeout, then optional fallback
    try {
      const output = await runWithRetry(
        () => runWithTimeout(() => stepToRun.run(ctx), stepToRun.timeoutMs),ctx.telemetry,name , stepToRun.id,
        stepToRun.retry
      );
  
      trace.push({
        type: "step_finished",
        intentName: name,
        stepId: stepToRun.id,
        timestamp: now(),
        success: true,
      });
  
      trace.push({
        type: "intent_finished",
        intentName: name,
        timestamp: now(),
        success: true,
      });
  
      return {
        intentName: name,
        success: true,
        output,
        trace,
      };
    } catch (error) {
      const fallbackStepId = stepToRun.fallbackTo;
  
      // No fallback configured → intent fails
      if (!fallbackStepId) {
        trace.push({
          type: "step_finished",
          intentName: name,
          stepId: stepToRun.id,
          timestamp: now(),
          success: false,
          error,
        });
  
        trace.push({
          type: "intent_finished",
          intentName: name,
          timestamp: now(),
          success: false,
          error,
        });
  
        return {
          intentName: name,
          success: false,
          error,
          trace,
        };
      }
  
      // Resolve fallback step
      const fallbackStep = steps.find((s) => s.id === fallbackStepId);
  
      if (!fallbackStep) {
        const fallbackError = new Error(
          `fallbackTo "${fallbackStepId}" does not match any step id.`
        );
  
        trace.push({
          type: "step_finished",
          intentName: name,
          stepId: stepToRun.id,
          timestamp: now(),
          success: false,
          error: fallbackError,
        });
  
        trace.push({
          type: "intent_finished",
          intentName: name,
          timestamp: now(),
          success: false,
          error: fallbackError,
        });
  
        return {
          intentName: name,
          success: false,
          error: fallbackError,
          trace,
        };
      }
  
      // Telemetry: primary failed, now starting fallback step
      trace.push({
        type: "step_finished",
        intentName: name,
        stepId: stepToRun.id,
        timestamp: now(),
        success: false,
        error,
      });
  
      trace.push({
        type: "step_started",
        intentName: name,
        stepId: fallbackStep.id,
        timestamp: now(),
      });
  
      // Run fallback step with same retry + timeout pipeline
      try {
        const fallbackOutput = await runWithRetry(
          () =>
            runWithTimeout(
              () => fallbackStep.run(ctx),
              fallbackStep.timeoutMs
            ),
          fallbackStep.retry
        );
  
        trace.push({
          type: "step_finished",
          intentName: name,
          stepId: fallbackStep.id,
          timestamp: now(),
          success: true,
        });
  
        trace.push({
          type: "intent_finished",
          intentName: name,
          timestamp: now(),
          success: true,
        });
  
        return {
          intentName: name,
          success: true,
          output: fallbackOutput,
          trace,
        };
      } catch (fallbackError) {
        trace.push({
          type: "step_finished",
          intentName: name,
          stepId: fallbackStep.id,
          timestamp: now(),
          success: false,
          error: fallbackError,
        });
  
        trace.push({
          type: "intent_finished",
          intentName: name,
          timestamp: now(),
          success: false,
          error: fallbackError,
        });
  
        return {
          intentName: name,
          success: false,
          error: fallbackError,
          trace,
        };
      }
    }
  }
  