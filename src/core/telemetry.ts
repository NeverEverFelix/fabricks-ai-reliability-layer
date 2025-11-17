/**
 * telemetry.ts
 * --------------
 * This file defines the **observability layer** of the AI Reliability Layer.
 *
 * WHAT TELEMETRY MEANS HERE:
 * ---------------------------
 * Telemetry = a stream of structured events emitted during intent execution.
 *
 * Example events:
 *    - intent_started
 *    - step_started
 *    - step_succeeded
 *    - step_failed
 *    - intent_finished
 *
 * These events allow:
 *    • debugging
 *    • tracing
 *    • performance measurement
 *    • analytics
 *    • production monitoring (in future versions)
 *
 * This file contains the minimal primitives needed to emit events in v1,
 * while keeping the design open for advanced telemetry systems later.
 *
 * PURPOSE OF THIS FILE (MVP):
 * ---------------------------
 * - Define the minimal event shape (TelemetryEvent).
 * - Define a "TelemetrySink" type — a function that consumes events.
 *     e.g., a console logger, or a forwarder to Datadog / OpenTelemetry.
 * - Expose a helper that the engine will call to push telemetry events into the sink.
 *
 * The **engine** calls telemetry — telemetry never calls the engine.
 * Telemetry is purely a side effect layer.
 *
 * MVP RESPONSIBILITIES:
 * ----------------------
 * This file will eventually contain:
 *
 *   • `emitEvent(ctx, event)`
 *        - Takes an event and forwards it to the active telemetry sink.
 *        - Appends events to the execution trace that gets returned to the user.
 *
 *   • `createConsoleTelemetrySink()`
 *        - A simple sink that logs events for debugging and examples.
 *
 * But for now, we are only documenting, not implementing.
 *
 * HOW ENGINE.USE THIS MODULE:
 * ----------------------------
 * Inside the engine:
 *
 *   emitEvent(ctx, { type: "step_started", stepId: "call-llm", ... })
 *   emitEvent(ctx, { type: "step_succeeded", stepId: "call-llm", ... })
 *   emitEvent(ctx, { type: "intent_finished", success: true })
 *
 * The engine does not need to know HOW telemetry is handled.
 * It only needs to "emit" events — telemetry.ts owns the mechanics.
 *
 * IMPORTANT ARCHITECTURAL SEPARATION:
 * ------------------------------------
 * - intent.ts    → defines the shape and validation of the workflow.
 * - engine.ts    → performs execution (runs steps, applies reliability policies).
 * - policies.ts  → defines wrappers for retry, timeout, fallback.
 * - telemetry.ts → records what happened.
 *
 * By separating telemetry into its own file:
 *    ✔ the engine stays clean
 *    ✔ telemetry can evolve independently
 *    ✔ users can plug in their own sinks
 *
 * FUTURE CAPABILITIES (AFTER MVP):
 * ---------------------------------
 *
 * 1. **OpenTelemetry Integration**
 *    - Export events as OTEL spans.
 *    - Automatic correlation IDs.
 *
 * 2. **Distributed Tracing**
 *    - Spans for each step
 *    - Error metadata
 *    - Timestamps for performance profiling
 *
 * 3. **Log Enrichment**
 *    - Include latency, retries used, fallback paths taken.
 *
 * 4. **Advanced Telemetry Sinks**
 *    - Datadog
 *    - Honeycomb
 *    - Grafana Loki
 *    - Custom user-defined sinks
 *
 * 5. **Filtering / Sampling**
 *    - Allow users to configure which telemetry events they want to keep.
 *
 * 6. **Intent-level Analytics**
 *    - Track success/failure rates over time.
 *    - Track which fallbacks were used most.
 *    - Build internal reliability dashboards.
 *
 * ROLE OF TELEMETRY IN THE OVERALL SYSTEM:
 * -----------------------------------------
 * Telemetry makes your reliability layer actually observable.
 *
 * Without telemetry:
 *    - You cannot debug steps.
 *    - You cannot measure retries / failures.
 *    - You cannot analyze intent performance in production.
 *
 * With telemetry:
 *    - Your reliability library behaves like a true production system.
 *    - Hiring managers can SEE execution traces in examples.
 *    - You unlock future real-world features instantly.
 *
 * This is the piece that elevates your project from
 *     “cute TypeScript utility”
 * to
 *     **a real orchestration engine with observability baked in.**
 */
