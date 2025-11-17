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
