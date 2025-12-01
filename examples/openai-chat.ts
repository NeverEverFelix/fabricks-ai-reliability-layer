import { defineIntent, runIntent } from "../src";
import { createOpenAIProvider } from "../src/providers/openai";
import { consoleTelemetrySink } from "../src/core/telemetry";


const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = createOpenAIProvider({
  apiKey,
  baseUrl: "https://api.openai.com/v1",
  defaultModel: "gpt-4.1-mini",
});

const intent = defineIntent<{ question: string }, string>({
  name: "Call Open AI",
  steps: [
    {
      id: "hello world",
      run: async (ctx) => {
        const response = await ctx.providers!.openai!.chat({
          prompt: ctx.input.question,
        });

        return response.content;
      },
    },
  ],
});

async function main() {
  const result = await runIntent(intent, {
    input: { question: "why am i like this?" },
    providers: { openai },
    telemetry: consoleTelemetrySink,
  });

  console.log("Execution result:", result);
}

main().catch((err) => {
  console.error("Error running intent:", err);
});