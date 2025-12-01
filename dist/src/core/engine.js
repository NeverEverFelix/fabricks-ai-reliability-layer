"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIntent = runIntent;
const policies_1 = require("./policies");
async function runIntent(intent, ctx) {
    const trace = [];
    const { name, steps } = intent;
    const telemetrySink = ctx.telemetry;
    const emit = (event) => {
        trace.push(event);
        telemetrySink?.(event);
    };
    const now = () => Date.now();
    // 1. No steps = fail fast (preserve previous behavior)
    if (!steps || steps.length === 0) {
        const error = new Error(`Intent "${name}" has no steps defined.`);
        emit({
            type: "intent_started",
            intentName: name,
            timestamp: now(),
        });
        emit({
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
    // 2. Resolve entry step (preserve entryStepId semantics)
    const entryStepId = intent.entryStepId ?? steps[0].id;
    const entryStep = steps.find((step) => step.id === entryStepId);
    if (!entryStep) {
        const error = new Error(`entryStepId "${entryStepId}" does not match any step id.`);
        emit({
            type: "intent_started",
            intentName: name,
            timestamp: now(),
        });
        emit({
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
    // 3. Normal path: mark intent started once
    emit({
        type: "intent_started",
        intentName: name,
        timestamp: now(),
    });
    let currentStepId = entryStep.id;
    let lastOutput;
    // Helper: run a step (with retry+timeout) and its optional fallback,
    // and decide which step comes next.
    const runStepWithFallback = async (step) => {
        // Primary step started
        emit({
            type: "step_started",
            intentName: name,
            stepId: step.id,
            timestamp: now(),
        });
        try {
            const output = await (0, policies_1.runWithRetry)(() => (0, policies_1.runWithTimeout)(() => step.run(ctx), step.timeoutMs, ctx.telemetry, name, step.id), ctx.telemetry, name, step.id, step.retry);
            emit({
                type: "step_finished",
                intentName: name,
                stepId: step.id,
                timestamp: now(),
                success: true,
            });
            // Linear chaining: go to the next step in the array
            const idx = steps.findIndex((s) => s.id === step.id);
            const next = steps[idx + 1];
            return {
                success: true,
                output: output,
                nextStepId: next?.id,
            };
        }
        catch (error) {
            const fallbackStepId = step.fallbackTo;
            // No fallback configured → step fails here
            if (!fallbackStepId) {
                emit({
                    type: "step_finished",
                    intentName: name,
                    stepId: step.id,
                    timestamp: now(),
                    success: false,
                    error,
                });
                return {
                    success: false,
                    error,
                };
            }
            // Resolve fallback step
            const fallbackStep = steps.find((s) => s.id === fallbackStepId);
            if (!fallbackStep) {
                const fallbackError = new Error(`fallbackTo "${fallbackStepId}" does not match any step id.`);
                emit({
                    type: "step_finished",
                    intentName: name,
                    stepId: step.id,
                    timestamp: now(),
                    success: false,
                    error: fallbackError,
                });
                return {
                    success: false,
                    error: fallbackError,
                };
            }
            // Telemetry: primary failed, now starting fallback step
            emit({
                type: "step_finished",
                intentName: name,
                stepId: step.id,
                timestamp: now(),
                success: false,
                error,
            });
            emit({
                type: "step_started",
                intentName: name,
                stepId: fallbackStep.id,
                timestamp: now(),
            });
            try {
                const fallbackOutput = await (0, policies_1.runWithRetry)(() => (0, policies_1.runWithTimeout)(() => fallbackStep.run(ctx), fallbackStep.timeoutMs, ctx.telemetry, name, fallbackStep.id), ctx.telemetry, name, fallbackStep.id, fallbackStep.retry);
                emit({
                    type: "step_finished",
                    intentName: name,
                    stepId: fallbackStep.id,
                    timestamp: now(),
                    success: true,
                });
                const idx = steps.findIndex((s) => s.id === fallbackStep.id);
                const next = steps[idx + 1];
                return {
                    success: true,
                    output: fallbackOutput,
                    nextStepId: next?.id,
                };
            }
            catch (fallbackError) {
                emit({
                    type: "step_finished",
                    intentName: name,
                    stepId: fallbackStep.id,
                    timestamp: now(),
                    success: false,
                    error: fallbackError,
                });
                return {
                    success: false,
                    error: fallbackError,
                };
            }
        }
    };
    // 4. Main linear loop: A → B → C (with fallback jumps)
    while (currentStepId) {
        const step = steps.find((s) => s.id === currentStepId);
        if (!step) {
            const error = new Error(`Intent "${name}" references unknown step "${currentStepId}".`);
            emit({
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
        const { success, output, nextStepId, error } = await runStepWithFallback(step);
        if (!success) {
            emit({
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
        if (output !== undefined) {
            lastOutput = output;
        }
        currentStepId = nextStepId;
    }
    // 5. All steps completed successfully
    emit({
        type: "intent_finished",
        intentName: name,
        timestamp: now(),
        success: true,
    });
    return {
        intentName: name,
        success: true,
        output: lastOutput,
        trace,
    };
}
