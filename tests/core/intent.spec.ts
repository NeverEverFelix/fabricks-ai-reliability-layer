/**
 * intent.spec.ts
 * ---------------
 * This file will contain the unit tests for the **intent definition layer**.
 *
 * PURPOSE OF THIS TEST FILE:
 * ---------------------------
 * The intent definition system ("intent.ts") is the **compiler** for your
 * reliability engine. It transforms user-provided configs into a validated,
 * normalized internal structure (IntentDefinition).
 *
 * These tests ensure:
 *    • The compiler (defineIntent) catches invalid workflows early.
 *    • Intent shapes are validated correctly.
 *    • Step IDs, fallbacks, and entry steps are consistent.
 *    • The resulting IntentDefinition is clean, predictable, and immutable.
 *
 * Incorrect intent definitions should never reach the execution engine.
 * This file guarantees that ANY misconfiguration fails FAST.
 *
 *
 * WHAT THESE TESTS WILL EVENTUALLY CHECK:
 * ---------------------------------------
 *
 * 1. **Intent name validation**
 *    - Empty or missing names should throw an IntentConfigurationError.
 *
 * 2. **Step existence checks**
 *    - Intent must have at least one step.
 *    - Missing step IDs should cause an error.
 *
 * 3. **Step ID uniqueness**
 *    - Duplicate step IDs must throw immediately.
 *
 * 4. **Fallback correctness**
 *    - fallbackTo must reference a valid step ID.
 *    - fallbackTo referencing a missing step should throw.
 *
 * 5. **Entry step validation**
 *    - Provided entryStepId must match a real step.
 *    - If omitted, the first step should become the entry step.
 *
 * 6. **Normalization behavior**
 *    - ensure that defineIntent clones/normalizes step arrays
 *      (mutating user input after creation should NOT mutate the intent definition)
 *
 * 7. **Step map construction**
 *    - stepMap should correctly map stepId → stepConfig.
 *    - stepMap should contain all steps exactly once.
 *
 * 8. **Immutability**
 *    - IntentDefinition returned by defineIntent should be frozen.
 *    - Attempting to mutate it should fail (use Object.isFrozen).
 *
 *
 * WHY THESE TESTS ARE IMPORTANT:
 * -------------------------------
 * If defineIntent fails to validate properly:
 *    - the engine might crash mid-execution,
 *    - fallback routing may break,
 *    - retry/timeout logic could wrap invalid steps,
 *    - telemetry events could reference missing step IDs,
 *    - and debugging becomes a nightmare.
 *
 * By fully testing intent.ts:
 *    ✔ The compiler becomes trustworthy.
 *    ✔ Invalid workflows never reach engine.ts.
 *    ✔ Reliability guarantees become predictable.
 *
 *
 * WHAT THIS FILE WILL *NOT* TEST:
 * -------------------------------
 * - Execution order → engine.spec.ts
 * - Retry/timeout logic → policies.spec.ts
 * - Telemetry emission → telemetry.spec.ts
 * - Provider behavior → providers/openai.spec.ts
 *
 * intent.spec.ts ONLY tests the correctness of intent definitions.
 *
 *
 * TEST STRATEGY (when implemented later):
 * ----------------------------------------
 * Use small, self-contained intent configs to test:
 *
 *    - defineIntent() success cases
 *    - defineIntent() failure cases
 *    - shape of the returned IntentDefinition
 *
 * Use a fake run function:
 *
 *    const step = { id: "s1", run: async () => "ok" }
 *
 * Avoid providers, engine logic, or real LLM calls.
 *
 * This ensures tests are fast, deterministic, and isolated.
 *
 *
 * SUMMARY:
 * --------
 * intent.spec.ts verifies the correctness of the *language* of intents.
 *
 * Good test coverage here:
 *    - prevents runtime failures,
 *    - keeps the engine clean,
 *    - and makes your reliability layer feel robust and production-ready.
 *
 * This is one of the most important test files in the entire project.
 */
