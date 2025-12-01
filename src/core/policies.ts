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

import { TelemetrySink} from "../types";

export class TimeOutError extends Error {
  constructor(message = "Operation Timed out"){
  super(message);
  this.name = "TimeOutError";
  }
}
export class RetryExhaustedError extends Error {
  constructor(message = "No More Retry Attempts Left"){
  super(message);
  this.name = "RetryExhaustError";
  }
}

export async function runWithRetry<T>(
  fn: () => Promise<T>,
  telemetry?: TelemetrySink,
  intentName?: string,
  stepId?: string,
  policy?: RetryPolicy,
): Promise<T> {
  
  
  const maxAttempts =
    policy && policy.maxAttemps > 0 ? policy.maxAttemps : 1;
  
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Emit telemetry for retry attempt start
    
    telemetry?.({
      type: "retry_attempt_started",
      intentName: intentName ?? "(unknown-intent)",
      stepId,
      attempt,
      timestamp: Date.now(),
    });

    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        // If we actually had a *real* retry (maxAttempts > 1), wrap in RetryExhaustedError
        if (maxAttempts > 1) {
          const message =
            intentName && stepId
              ? `Step "${stepId}" in intent "${intentName}" failed retry after ${maxAttempts} attempts`
              : `Operation failed after ${maxAttempts} attempts`;

          throw new RetryExhaustedError(message);
        }

        // No policy / only 1 attempt → propagate original error
        throw lastError;
      }
      telemetry?.({
        type:"retry_attempt_failed",
        intentName: intentName ?? "(unknown-intent)",
        stepId,
        attempt,
        error:error,
        timestamp: Date.now()
      });
    }
  }

  throw lastError ?? new Error("Unknown retry failure");
}

export async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs?: number,
  telemetry?: TelemetrySink,
  intentName?: string,
  stepId?: string
): Promise<T> {
  // If no timeout or invalid timeout, just run the function directly
  if (timeoutMs == null || timeoutMs <= 0) {
    return fn();
  }

  const now = () => Date.now();
  const message = intentName && stepId ? `Step "${stepId}" in intent "${intentName}" timed out after ${timeoutMs}ms`
    : `Operation timed out after ${timeoutMs}ms`;
  const error = new TimeOutError(message);
    const safeIntentName = intentName ?? "(unknown-intent)";

  // timeout_started
  telemetry?.({
    type: "timeout_started",
    intentName: safeIntentName,
    stepId,
    timestamp: now(),
  });

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      // timeout_fired
      telemetry?.({
        type: "timeout_fired",
        intentName: safeIntentName,
        stepId,
        timestamp: now(),
      });

      reject(error);
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        // timeout_cleared
        telemetry?.({
          type: "timeout_cleared",
          intentName: safeIntentName,
          stepId,
          timestamp: now(),
        });
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        // timeout_cleared
        telemetry?.({
          type: "timeout_cleared",
          intentName: safeIntentName,
          stepId,
          timestamp: now(),
        });
        reject(err);
      });
  });
}
