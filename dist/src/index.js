"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAIProvider = exports.RetryExhaustedError = exports.TimeOutError = exports.runIntent = exports.defineIntent = void 0;
// module.exports = require("./dist/index.js");
var intent_1 = require("./core/intent");
Object.defineProperty(exports, "defineIntent", { enumerable: true, get: function () { return intent_1.defineIntent; } });
var engine_1 = require("./core/engine");
Object.defineProperty(exports, "runIntent", { enumerable: true, get: function () { return engine_1.runIntent; } });
var policies_1 = require("./core/policies");
Object.defineProperty(exports, "TimeOutError", { enumerable: true, get: function () { return policies_1.TimeOutError; } });
Object.defineProperty(exports, "RetryExhaustedError", { enumerable: true, get: function () { return policies_1.RetryExhaustedError; } });
var openai_1 = require("./providers/openai");
Object.defineProperty(exports, "createOpenAIProvider", { enumerable: true, get: function () { return openai_1.createOpenAIProvider; } });
