/**
 * This file defines the *public way* to create an intent.
 *
 * Conceptually:
 * - An **intent** is a named workflow: a sequence of steps with reliability policies.
 * - The **engine** will never build intents manually — it only consumes the
 *   validated, normalized "IntentDefinition" that comes from here.
 *
 * Responsibilities of this module:
 * - Take a user-provided IntentConfig (high-level description).
 * - Validate it (unique step ids, valid fallbacks, valid entry step).
 * - Normalize it into an internal structure the engine can run quickly:
 *   - `stepMap`: Map<stepId, stepConfig> for O(1) lookups.
 *   - `entryStepId`: the first step to execute (explicit or inferred).
 * - Freeze the result so it’s immutable and safe to reuse across requests.
 *
 * Think of this file as the “compiler” for your mini intent DSL.
 */
// In a later pass we can swap these generic `Error`s for a custom
// IntentConfigurationError in ../utils/errors if we want nicer error types.

/**
 * Public factory used by library consumers.
 *
 * Example usage (from a user’s app):
 *
 * const myIntent = defineIntent({
 *   name: "answer-user-question",
 *   steps: [
 *     { id: "call-llm", run: async (ctx) => { ... } },
 *     { id: "validate", run: async (ctx) => { ... }, fallbackTo: "fallback" },
 *     { id: "fallback", run: async (ctx) => { ... } },
 *   ],
 *   // optional: entryStepId: "call-llm"
 * });
 *
 * The returned object is:
 * - validated (bad configs throw early)
 * - normalized (has stepMap + concrete entryStepId)
 * - immutable (safe to share between requests / threads)
 */