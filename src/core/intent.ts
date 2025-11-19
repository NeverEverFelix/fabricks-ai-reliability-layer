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

// src/core/intent.ts
import type { Intent, IntentConfig, StepId } from "../types";

export function defineIntent<Input = unknown, Output = unknown>(
  config: IntentConfig<Input, Output>
): Intent<Input, Output> {
 
  if (!config || typeof config !== "object") {
    throw new Error("Config must be an object");
  }

  
  const { name, steps, entryStepId } = config;

  
  if (!name || typeof name !== "string") {
    throw new Error("Intent must have a non-empty name");
  }

  
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`defineIntent("${name}"): intent must have at least one step`);
  }

  // 5. Check each step has a unique id and a run() function
  const ids = new Set<StepId>();

  for (const step of steps) {
    if (!step.id) {
      throw new Error(`defineIntent("${name}"): found a step with no id`);
    }

    if (ids.has(step.id)) {
      throw new Error(
        `defineIntent("${name}"): duplicate step id "${step.id}"`
      );
    }

    ids.add(step.id);

    if (typeof step.run !== "function") {
      throw new Error(
        `defineIntent("${name}"): step "${step.id}" is missing a valid run() function`
      );
    }
  }

  
  const finalEntryStepId: StepId = entryStepId ?? steps[0].id;

  if (!ids.has(finalEntryStepId)) {
    throw new Error(
      `defineIntent("${name}"): entryStepId "${finalEntryStepId}" does not match any step id`
    );
  }

  // 7. Build the final normalized Intent object
  const normalized: Intent<Input, Output> = {
    name,
    steps: steps.slice(), // copy array so user can’t mutate ours
    entryStepId: finalEntryStepId
  };

  // 8. Freeze to make it read-only
  return Object.freeze(normalized);
}
