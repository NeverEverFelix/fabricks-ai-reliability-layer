import { describe, it, expect } from "vitest";
import {
  defineIntent,
  runIntent,
  TimeOutError,
  RetryExhaustedError,
} from "../../src";

describe("public API surface", () => {
  it("allows defining and running an intent via the top-level entrypoint", async () => {
    const intent = defineIntent<{ name: string }, string>({
      name: "greet-intent",
      steps: [
        {
          id: "greet",
          async run(ctx) {
            return `Hello, ${ctx.input.name}!`;
          },
        },
      ],
      entryStepId: "greet",
    });

    const result = await runIntent(intent, {
      input: { name: "Felix" },
      metadata: {}, // required by new ExecutionContext
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello, Felix!");
  });

  it("exposes error types for instanceof checks", () => {
    const t = new TimeOutError();
    const r = new RetryExhaustedError();

    expect(t).toBeInstanceOf(TimeOutError);
    expect(r).toBeInstanceOf(RetryExhaustedError);
  });
});
