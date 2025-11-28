/**
 * openai.ts
 * ----------
 * This file provides the **OpenAI provider adapter** for the AI Reliability Layer.
 *
 * HIGH-LEVEL PURPOSE:
 * --------------------
 * The engine and intent system must NOT depend directly on any specific LLM vendor.
 *
 * That means:
 *   - The engine should NOT import the OpenAI SDK.
 *   - Step functions should NOT know how OpenAI’s APIs are shaped internally.
 *   - The library must be able to support additional providers later without
 *     changing core code (Anthropic, Cohere, Gemini, local models, etc.)
 *
 * To achieve this, this file defines a **tiny, stable interface** that represents
 * “what the engine needs from a model provider.”
 *
 * EXAMPLE OF THIS "MINIMAL INTERFACE":
 * ------------------------------------
 * An OpenAI-like provider only needs to expose:
 *
 *      chat({ model, messages }) → { content: string }
 *
 * Why only this?
 * - Because every LLM, no matter the vendor, can express a “chat-like” call.
 * - Your reliability layer is NOT a full OpenAI client — it only orchestrates.
 *
 * WHAT THIS FILE WILL CONTAIN (LATER IMPLEMENTATION):
 * ----------------------------------------------------
 *
 * 1. **Type definitions for provider shape**
 *    e.g.:
 *      export interface OpenAIProviderClient {
 *         chat: (params) => Promise<{ content: string }>
 *      }
 *
 * 2. **A factory function**
 *    - something like: `createOpenAIProvider(openAIClient)`
 *    - This wraps the official OpenAI SDK (v4 `client.responses.create`, v3 `client.chat.completions.create`)
 *      and normalizes the output into the minimal interface your engine expects.
 *
 * 3. **Error normalization**
 *    - Translate OpenAI errors into standard Error objects.
 *    - This allows retry, timeout, and fallback policies to reason about errors cleanly.
 *
 * 4. **(Optional future) Streaming support**
 *    - Convert OpenAI’s streaming APIs into an async generator so steps can stream tokens.
 *
 * WHY THIS FILE MATTERS:
 * -----------------------
 * This is where **clean architecture** shines.
 *
 * It ensures:
 *   • The engine stays vendor-agnostic.
 *   • Step logic never depends on the OpenAI SDK shape.
 *   • The library can support new LLMs with minimal code changes.
 *
 * Without this provider-abstraction layer, your reliability system would be:
 *    ❌ tightly coupled to OpenAI
 *    ❌ difficult to test
 *    ❌ difficult to extend to other providers
 *
 * With the provider layer:
 *    ✔ clean separation of concerns
 *    ✔ mockable in unit tests (no real API calls)
 *    ✔ easy multi-provider support in the future
 *
 * MVP DESIGN:
 * ------------
 * For v1 of your reliability layer:
 *
 * - Only ONE provider is required: OpenAI.
 * - Only ONE operation is required: chat (messages in → text out).
 * - Complex concerns like function calling, embeddings, and logprobs are out of scope.
 *
 * This keeps the library focused and professional while still solving a real problem.
 *
 * FUTURE ROADMAP FOR THIS FILE:
 * ------------------------------
 *
 * 1. **Multi-vendor support**
 *      - `createAnthropicProvider()`
 *      - `createCohereProvider()`
 *      - `createOllamaProvider()`
 *
 *      Providers become a plug-in layer.
 *
 * 2. **Provider selection per step**
 *      Step configs could define:
 *          provider: "openai" | "anthropic"
 *
 * 3. **Streaming responses**
 *      - Unified streaming abstraction: `provider.streamChat()`
 *      - Steps could consume streaming tokens directly.
 *
 * 4. **Batching or caching**
 *      - Provider wrappers could implement internal caching for repeated calls.
 *
 * 5. **Structured output handling**
 *      - Provider layer could enforce JSON schema validation.
 *
 * TESTING IMPLICATIONS:
 * ----------------------
 * By isolating the provider in this file:
 *
 * - You can easily mock the provider in unit tests.
 * - The engine never touches the network.
 * - Step logic remains deterministic.
 *
 * This file is absolutely crucial to making the entire system testable and maintainable.
 *
 * SUMMARY:
 * ---------
 * `openai.ts` is not about OpenAI.
 * It is about **abstraction**.
 *
 * It's the plug that lets your reliability engine call *any* LLM,
 * while keeping your architecture clean, scalable, and professional.
 */

export interface OpenAIProviderClient{
   chat: (params:ChatParameters)=> Promise<{content:string}>
}
export interface ChatParameters{
    prompt:string;
    model?:string;
}
export interface OpenAi {
    apikey:string,
    baseUrl?:string,
    defaultModel?:string,
}
export function createOpenAIProvider(
    config: OpenAi,
):OpenAIProviderClient {
    const {
        apikey
        baseUrl = "https://api.openai.com/v1",
        defaultModel = "gpt-4.1-mini",
    } = config;

    
}
  
