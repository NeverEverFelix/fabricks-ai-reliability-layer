/**
 * index.ts
 * ---------
 * This file defines the **public API surface** of the AI Reliability Layer.
 *
 * PURPOSE OF THIS FILE:
 * ----------------------
 * - Everything this library exposes to users is re-exported from here.
 * - This is the “single entry point” for consumers of the package.
 * - It is what gets published to NPM.
 *
 * When a developer installs your library, they will import from:
 *
 *      import { defineIntent, runIntent } from "ai-reliability-layer";
 *
 * This file controls EXACTLY what appears in that namespace.
 *
 * WHAT THIS FILE WILL EVENTUALLY EXPORT:
 * ---------------------------------------
 *
 * 1. **Core API Functions**
 *      - `defineIntent` (from core/intent)
 *      - `runIntent` (from core/engine)
 *
 * 2. **Types**
 *      - IntentConfig
 *      - IntentDefinition
 *      - StepConfig
 *      - ExecutionContext
 *      - ExecutionResult
 *      - TelemetryEvent
 *      - RetryPolicy
 *
 *    Re-exported from src/types/index.ts so that users don’t have to dig into folders.
 *
 * 3. **Optional Helpers**
 *      - `createConsoleTelemetrySink` (from telemetry.ts)
 *      - `OpenAIProviderClient` (from providers/openai.ts)
 *
 * 4. **Nothing internal**
 *      - Internal helpers, internal.ts, utils, or engine internals DO NOT get exported.
 *      - This prevents breaking changes and keeps your surface VERY clean.
 *
 *
 * WHY THIS FILE IS IMPORTANT:
 * ----------------------------
 * A clean `index.ts` is one of the strongest signals of a *well-designed* library.
 *
 * - Keeps the API surface minimal.
 * - Prevents leaking implementation details.
 * - Allows you to rearrange internal code without breaking users.
 * - Makes your library feel “stable” and “intentional.”
 *
 * This is exactly how professional libraries (like React, Lodash, Zod, Prisma)
 * expose their API — a small set of curated exports.
 *
 *
 * FUTURE ROLE OF THIS FILE:
 * --------------------------
 * As your library grows, this file remains the **public gatekeeper**.
 *
 * Example future exports may include:
 *    • Multiple providers (AnthropicProvider, OllamaProvider, etc.)
 *    • DAG execution helpers (once added)
 *    • Advanced telemetry utilities
 *    • Schema validators for structured outputs
 *
 * But the key is:
 *      **The surface stays small.**
 *
 * All expansion happens internally unless it genuinely belongs in the public API.
 *
 *
 * MVP SCOPE FOR THIS FILE:
 * -------------------------
 * In v1, this file will likely expose:
 *
 *    export { defineIntent }   from "./core/intent";
 *    export { runIntent }      from "./core/engine";
 *    export * from "./types";
 *
 * Plus possibly:
 *    export { createConsoleTelemetrySink } from "./core/telemetry";
 *    export type { OpenAIProviderClient }  from "./providers/openai";
 *
 * Keeping it simple = professional.
 *
 *
 * SUMMARY:
 * --------
 * `index.ts` is the **front door** of your library.
 *
 * It controls:
 *    • what users see,
 *    • what users can import,
 *    • and what stability guarantees you provide.
 *
 * You implement this LAST, once all internals are complete,
 * so you know exactly what the clean public API should look like.
 */
export {};
//what runIntent returns
