/**
 * errors.ts
 * ----------
 * This file defines **custom error types** used across the AI Reliability Layer.
 *
 * WHY THIS FILE EXISTS:
 * ----------------------
 * Error handling is a *major* part of reliability engineering.
 * But raw JavaScript Errors are too vague:
 *
 *    - They don’t tell you which step failed.
 *    - They don’t differentiate between timeout vs retry vs user error.
 *    - They make debugging harder.
 *
 * By defining **custom error classes**, the rest of the system can:
 *    • Identify error types programmatically.
 *    • Apply retry logic only to certain error classes.
 *    • Emit better telemetry with structured metadata.
 *    • Keep engine logic clean and focused.
 *
 *
 * WHAT THIS FILE WILL EVENTUALLY CONTAIN:
 * ----------------------------------------
 * Not now — just documenting — but later you will implement:
 *
 *
 * 1. **IntentConfigurationError**
 *    - Thrown when `defineIntent()` detects misconfiguration:
 *         • duplicate step ids
 *         • missing run functions
 *         • invalid fallback targets
 *    - Fails fast at definition-time, not runtime.
 *
 *
 * 2. **StepExecutionError**
 *    - Thrown when a step’s `run()` throws.
 *    - Wraps the underlying cause while attaching:
 *         • stepId (which step failed)
 *         • attempt (if using retry)
 *         • maybe provider name (OpenAI, Anthropic, etc.)
 *
 *    This error makes telemetry richer and makes retry logic safer.
 *
 *
 * 3. **TimeoutError**
 *    - Used when a step exceeds its allowed time budget.
 *    - Allows policies.ts to differentiate between:
 *         • genuine step failures
 *         • operations that simply took too long
 *
 *
 * 4. **FallbackError** (future)
 *    - Used if a fallback fails after the primary also failed.
 *    - Helps engine.ts determine whether an intent should stop immediately.
 *
 *
 * 5. **ProviderError** (future)
 *    - A normalized representation of LLM provider failures (OpenAI, Anthropic, etc.)
 *    - Translates vendor-specific errors into a consistent shape.
 *
 *
 * HOW OTHER FILES WILL USE THESE ERRORS:
 * ---------------------------------------
 *
 * • intent.ts
 *    - Throws IntentConfigurationError during validation.
 *
 * • engine.ts
 *    - Wraps step failures in StepExecutionError to attach metadata.
 *    - Emits telemetry events containing the error type.
 *
 * • policies.ts
 *    - Retry logic may behave differently depending on error class.
 *    - Timeout logic will throw TimeoutError which is easy to detect.
 *
 * • telemetry.ts
 *    - Records which error type occurred for observability.
 *
 *
 * WHY CUSTOM ERRORS ARE IMPORTANT FOR RELIABILITY:
 * ------------------------------------------------
 * They enable:
 *   ✔ Classification of failure types
 *   ✔ Selective retry (retry on timeouts, not on validation errors)
 *   ✔ Better debugging
 *   ✔ Better telemetry
 *   ✔ Cleaner architecture (engine doesn't use string matching)
 *
 *
 * FUTURE EVOLUTION OF THIS FILE:
 * -------------------------------
 * This file can grow to support advanced reliability features:
 *
 * 1. **Error tagging**
 *      - `error.category = "rate-limit" | "provider" | "user" | "timeout"`
 *
 * 2. **Stack trace enrichment**
 *      - Include intentName, stepId, attempt number, provider info.
 *
 * 3. **Serializable errors**
 *      - Convert errors into JSON for logs or remote monitoring.
 *
 * 4. **Recovery hints**
 *      - Provide hints like "tryFallback" or "giveUp" for future automatic planners.
 *
 *
 * ARCHITECTURAL ROLE:
 * --------------------
 * This is the **error vocabulary layer** of the system.
 *
 * - Policies use these to decide how to retry or fallback.
 * - Engine uses them to determine how to route execution.
 * - Telemetry uses them to*
*/