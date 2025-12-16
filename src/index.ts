/**
 * index.js (root-level)
 * ---------------------
 * This file is OPTIONAL.
 *
 * Its only purpose is to act as a compatibility entry point for environments
 * that expect a root "index.js" instead of using the package.json "exports"
 * field or the compiled "dist/index.js".
 *
 * In modern TypeScript libraries:
 *   - The TRUE public API is defined in src/index.ts.
 *   - The TypeScript compiler outputs dist/index.js.
 *   - Package.json points to dist/index.js via "main", "module", or "exports".
 *
 * Therefore, this file usually just re-exports the built output.
 * It does NOT contain logic, types, or API surface.
 *
 * Most libraries do NOT need this file at all.
 * It is safe to delete as long as package.json is correctly configured.
 */





// module.exports = require("./dist/index.js");

export { defineIntent } from "./core/intent";
export { runIntent } from "./core/engine";

export type{
    Intent,
    IntentConfig,
    StepConfig,
    ExecutionContext,
    TelemetryEvent,
    ExecutionResult,
} from "./types";

export type { RetryPolicy } from "./core/policies";


export type { TelemetrySink } from "./types";
export { consoleTelemetrySink } from "./core/telemetry";

export { TimeOutError, RetryExhaustedError } from "./core/policies";

export {createOpenAIProvider} from "./providers/openai";
