# fabricks-ai-reliability-layer
 Intent-based reliability primitives for LLM workflows — retries, timeouts, fallbacks, and telemetry in a tiny TypeScript library.

 ## Why and what this package solves

Modern LLMs are powerful but unpredictable: they time out, rate-limit, drift in quality, and occasionally fail without warning.  
Most developers end up hand-rolling ad-hoc retries, timeouts, and fallbacks scattered across their codebase — fragile, inconsistent, and hard to debug.

**AI Reliability Layer** provides a clean, intent-based way to describe *what you want the model to do*, while the library handles *how to do it reliably*.

It solves three core problems:

1. **Flaky LLM calls**  
   Built-in retry, timeout, and fallback policies turn unreliable model calls into stable execution paths.

2. **Scattered error handling**  
   Reliability logic is centralized, deterministic, and observable — no more copy-pasted try/catch blocks.

3. **Lack of visibility**  
   Every step emits structured telemetry, so you can trace exactly what happened, why, and how long it took.

In short:  
**You focus on your workflow’s intent.  
The library guarantees it runs predictably.**

## Features at a glance

- **Intent-based workflow definition** — describe what your workflow should do, not how to orchestrate it.
- **Retries, timeouts, and fallbacks built in** — turn flaky LLM calls into dependable execution paths.
- **Deterministic execution engine** — every run produces a clear, ordered trace of what happened.
- **Structured telemetry events** — observe step starts, successes, failures, retries, and fallbacks in real time.
- **Lightweight OpenAI provider** — a tiny adapter for making reliable model calls without heavy SDKs.
- **Minimal API surface** — define an intent, run it, inspect the result; no infrastructure required.
- **Test-friendly by design** — inject fake providers or override execution behavior for unit tests.
- **Small, focused, and fast** — under-the-hood complexity stays invisible so you can ship reliable workflows quickly.

## Quick start

Install the package:

```bash
npm install ai-reliability-layer

import { defineIntent, runIntent } from "ai-reliability-layer";

const getAnswer = defineIntent({
  name: "getAnswer",
  steps: [
    {
      id: "primary",
      run: async (ctx) =>
        ctx.providers.openai.chat({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "You are a concise assistant." },
            { role: "user", content: ctx.input.question },
          ],
        }),
      retry: { maxAttempts: 2 },
      timeoutMs: 5000,
      fallbackTo: "fallback",
    },
    {
      id: "fallback",
      run: async (ctx) =>
        ctx.providers.openai.chat({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Fallback model. Be brief." },
            { role: "user", content: ctx.input.question },
          ],
        }),
    },
  ],
});

const result = await runIntent(getAnswer, {
  question: "Why Kaniko over DinD?",
});

console.log(result);

## Core concepts

AI Reliability Layer is intentionally small. It’s built around a few core ideas that make LLM workflows predictable, observable, and easy to reason about.

---

### **Intents**

An **intent** describes *what you want your workflow to accomplish* — not the low-level mechanics of making the model behave.  
It consists of a named collection of ordered steps, each representing a meaningful action in your workflow (e.g., “call the primary model,” “sanitize output,” “fallback to a cheaper model,” etc.).

You define intents with `defineIntent()`, and the library guarantees deterministic, reliability-aware execution.

---

### **Steps**

A **step** is the smallest unit of work in an intent.  
Each step declares:

- an `id`  
- a `run(ctx)` function  
- optional `retry` policy  
- optional `timeoutMs`  
- optional `fallbackTo` another step  

Steps form a small DAG, where fallback paths create branching execution flows.  
The goal is to describe intent; the engine handles control flow.

---

### **Reliability policies**

Every step can declare basic reliability rules:

- **Retry** — how many attempts to make before giving up  
- **Timeout** — how long the step is allowed to run  
- **Fallback** — which step to jump to if the primary path fails  

These policies turn flaky model calls into stable, predictable pathways.

---

### **Execution context (`ctx`)**

Each step receives a `ctx` object with:

- **input** — the data passed to `runIntent()`  
- **providers** — such as `ctx.providers.openai`  
- **metadata** — optional user-defined information  
- **telemetry emitter** — passed internally to log events  

This context is how your steps communicate with external systems while keeping the engine pure and testable.

---

### **Telemetry**

The engine emits structured events during a run:

- step start  
- step success  
- step failure  
- retries  
- timeouts  
- fallback activations  
- run completion  

You can attach a custom event sink to observe these in real time or store them for later debugging.  
Telemetry is one of the most important pieces: it makes workflow behavior transparent.
