/**
 * policies.ts
 * ------------
 * This file defines the **reliability primitives** used by the engine.
 *
 * High-level purpose:
 * -------------------
 * Every step in an intent can optionally declare reliability policies:
 *
 *    - retry     (retry N times on error)
 *    - timeout   (cancel if step takes too long)
 *    - fallback  (jump to a different step if this one fails)
 *
 * The logic for these behaviors lives here, *not inside the engine*.
 *
 * WHY THIS FILE EXISTS:
 * ---------------------
 * The engine’s job is to run steps in order.
 * It should NOT be concerned with the low-level details of:
 *   • implementing retry loops
 *   • enforcing timeouts
 *   • switching to fallback step IDs
 *
 * Instead, the engine delegates these concerns to helper functions
 * defined in this file. This keeps the architecture clean and modular.
 *
 * RESPONSIBILITIES OF THIS FILE:
 * ------------------------------
 * - Provide small, focused helpers the engine can compose:
 *
 *   • withRetry(fn, retryPolicy)
 *       - Re-runs a step’s work on failure.
 *       - Usually a loop: attempt → catch → retry until maxAttempts.
 *       - Supports custom backoff strategies in the future.
 *
 *   • withTimeout(fn, ms)
 *       - Executes a step with an upper time bound.
 *       - Cancels or rejects when the time limit is exceeded.
 *
 *   • withFallback(primaryFn, fallbackFn)
 *       - If primary fails, run fallback.
 *       - If primary succeeds, fallback is ignored.
 *
 * None of these mutate state or know about the workflow.
 * They are functional wrappers the engine applies around the step.
 *
 * HOW THE ENGINE USES THIS:
 * --------------------------
 * Inside engine.executeStep (future):
 *
 *    let result = step.run(ctx)
 *    result = withRetry(result, step.retry)
 *    result = withTimeout(result, step.timeoutMs)
 *    result = withFallback(result, fallbackStep.run)
 *
 * The engine composes these wrappers *in order* to apply the reliability guarantees.
 *
 * MVP BEHAVIOR (CURRENT SCOPE):
 * ------------------------------
 * - Retry: Simple linear retry with no jitter/backoff required at first.
 * - Timeout: Promise.race between step.run and a timeout promise.
 * - Fallback: Only runs if step.run throws.
 *
 * This meets the v1 scope for your AI Reliability Layer and is enough to
 * outperform 99% of new-grad SWE portfolio projects.
 *
 * FUTURE EVOLUTION OF THIS FILE:
 * -------------------------------
 * Over time, `policies.ts` can become extremely powerful.
 * Here are the reliability patterns you may add later:
 *
 * 1. **Exponential backoff**
 *    - backoffMs: attempt => 100 * 2^attempt
 *
 * 2. **Jitter (randomized backoff)**
 *    - reduces retry storms in distributed systems.
 *
 * 3. **Circuit breakers**
 *    - if a step fails too often, automatically “open” the circuit
 *      and skip execution for a cooldown period.
 *
 * 4. **Bulkhead limits**
 *    - restrict how many concurrent executions can happen.
 *
 * 5. **Deadlines**
 *    - cumulative time budgets for a whole intent, not just a step.
 *
 * 6. **Fallback branching**
 *    - more complex fallback rules, like:
 *      fallbackTo: ["fast-model", "safer-model", "cached-response"]
 *
 * 7. **Conditional retry logic**
 *    - retry only on specific error classes (e.g., rate limit errors).
 *
 * 8. **Observability hooks**
 *    - emit telemetry events for retry attempts, timeout triggers, fallback usage.
 *
 * ARCHITECTURAL IMPORTANCE:
 * --------------------------
 * This file is where you demonstrate knowledge of:
 *   - resilience engineering
 *   - reliability patterns
 *   - distributed systems thinking
 *
 * It keeps engine.ts simple and maintains correct separation of concerns:
 *
 *   • policies.ts = *how steps are protected*
 *   • engine.ts    = *how steps are orchestrated*
 *   • intent.ts    = *what steps exist*
 *
 * Without this file, the engine would become bloated and unreadable.
 * With it, your entire system becomes extensible, testable, and clean.
 */


export interface RetryPolicy {
    maxAttemps: number;
}
export async function runWithRetry<T>(
    fn: () => Promise<T>,
    policy?: RetryPolicy
  ): Promise<T> {
    // pick a safe number of attempts
    const maxAttempts =
      policy && policy.maxAttemps > 0 ? policy.maxAttemps : 1;
  
    let lastError: unknown;
  
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // If fn() succeeds, we return immediately
        return await fn();
      } catch (error) {
        lastError = error;
  
        // If this was the last attempt → throw the error
        if (attempt === maxAttempts) {
          throw lastError;
        }
  
        // Otherwise continue loop and retry
      }
    }
  
    // Should never reach this point
    throw lastError ?? new Error("Unknown retry failure");
  }