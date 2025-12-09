## [0.1.1] - 2025-12-04
### Added
- `examples/basic-intent.ts` and `examples/openai-chat.ts` to demonstrate basic execution and OpenAI provider usage.
- Included `examples/` in the npm package.
## [0.1.2] - 2025-12-09
### Added
- `metadata` in `ExceutionContext` and `ExecutionResult` are no longer optional. This gurantees 3 things:
    - 1. Steps never have to check if `ctx.metadata` exists
    - 2. The engine can guarantee a “per-run scratchpad” is always there
        - "All steps in a run share one scratchpad object for expensive results or intermediate state."
    - 3. Less runtime errors, stronger typing
- Included `examples/` in the npm package.

