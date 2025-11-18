/**
 * fakeFail.ts
 * -------------
 * This file provides **controlled failure simulators** for testing the
 * reliability engine (retry, timeout, fallback, etc.).
 *
 * PURPOSE OF THIS FILE:
 * ----------------------
 * In real production environments, failures are:
 *    - random,
 *    - unpredictable,
 *    - intermittent,
 *    - impossible to reproduce perfectly.
 *
 * But in a test environment, **we must reproduce failures 100% consistently**.
 *
 * This file gives us **deterministic failure generators** that allow us to:
 *    ✔ Test retry logic  
 *    ✔ Test fallback logic  
 *    ✔ Test timeout behavior  
 *    ✔ Test sequencing of failures  
 *    ✔ Simulate flaky model providers  
 *
 * Without these helpers, reliability tests become brittle or impossible.
 *
 *
 * WHAT THIS FILE WILL EVENTUALLY EXPORT (no implementation yet):
 * ---------------------------------------------------------------
 *
 * 1. `fakeFailAfter(n, value)`
 *      - Fails the first `n` times it's called.
 *      - On call #n+1, returns `value`.
 *
 *      This is PERFECT for testing retry policies:
 *          - test retry succeeds on last attempt
 *          - test retry gives up after maxAttempts
 *
 *
 * 2. `fakeProbabilisticFail(p, value)`
 *      - Fails with probability `p` (0 ≤ p ≤ 1).
 *      - Returns `value` with probability (1 - p).
 *
 *      Useful for **stress-testing** reliability behavior under randomness.
 *      Should NOT be used in engine.spec (use deterministic version there).
 *
 *
 * 3. `fakeAlwaysFail(error?)`
 *      - Always throws, every call, forever.
 *      - Good for:
 *          • fallback chain testing,
 *          • verifying retry gives up,
 *          • ensuring timeout logic fires consistently.
 *
 *
 * 4. `fakeAlwaysSucceed(value)`
 *      - Always resolves with `value`.
 *      - Useful when the step should ALWAYS succeed and you only test context behavior.
 *
 *
 * 5. (Future) `fakeSlow(ms, value)`
 *      - Returns a Promise that resolves after `ms` milliseconds.
 *      - Used to test timeout logic in policies.ts.
 *
 *
 * 6. (Future) `fakeSequence(outcomes)`
 *      - Accepts an array describing exact success/failure pattern:
 *
 *            ["fail", "fail", "success", "fail", "success"]
 *
 *      - Each call returns the next outcome in the array.
 *      - Makes fallback + retry behavior 100% predictable.
 *
 *
 * WHY THIS FILE IS **NOT PART OF THE LIBRARY API**:
 * --------------------------------------------------
 * These helpers are ONLY for internal development/testing.
 *
 * They should NOT be published or exposed:
 *   - They do not represent real reliability behavior.
 *   - They exist purely to simulate failures in a controlled way.
 *   - They prevent test pollution in production builds.
 *
 * Tests will import them like:
 *
 *      import { fakeFailAfter } from "../helpers/fakeFail";
 *
 *
 * HOW THE TEST SUITES WILL USE THIS FILE:
 * ----------------------------------------
 *
 * • engine.spec.ts
 *      - Verify retry → fallback routing using fakeFailAfter().
 *      - Verify final success/failure under timed sequences.
 *
 * • policies.spec.ts
 *      - Test retry correctness in isolation.
 *      - Test timeout interactions with fakeSlow().
 *      - Test fallback interactions deterministically.
 *
 * • providers/openai.spec.ts
 *      - Simulate provider returning failure `p%` of the time.
 *      - Simulate rate limit errors or internal errors.
 *
 *
 * WHY THIS FILE IS CRITICAL TO THE RELIABILITY LAYER:
 * ---------------------------------------------------
 * Because reliability systems MUST be tested under controlled failure:
 *
 *    - Retry logic must be validated for every attempt boundary.
 *    - Timeout behavior must be triggered deliberately.
 *    - Fallback chains must be predictable and testable.
 *    - Telemetry must record error events accurately.
 *
 * These helpers allow you to create reproducible failure scenarios
 * WITHOUT:
 *   • randomness,
 *   • real API calls,
 *   • flaky behavior,
 *   • nondeterministic tests.
 *
 *
 * SUMMARY:
 * ---------
 * fakeFail.ts is a **test-only failure simulation toolkit** that allows
 * your reliability engi*
