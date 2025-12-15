import {
  defineIntent,
  runIntent,
  createOpenAIProvider,
} from "fabricks-ai-reliability-layer";


import express from "express";

console.log("Has OpenAI key:", !!process.env.OPENAI_API_KEY);

const app = express();
app.use(express.static("public"));
app.use(express.json());

const providers = {
  openai: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
};

app.get("/health", (_req, res) => res.json({ ok: true }));

const openaiOnceIntent = defineIntent({
  name: "openai-once",
  steps: [
    {
      id: "chat",
      run: async (ctx) => {
        const prompt = ctx.input?.prompt ?? "Say hello in one sentence.";
        const out = await ctx.providers.openai.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });
        return out;
      },
    },
  ],
  entryStepId: "chat",
});

app.post("/api/run/openai-once", async (req, res) => {
  const events = [];
  const result = await runIntent(openaiOnceIntent, {
    input: { prompt: req.body?.prompt },
    providers,
    telemetry: (e) => events.push(e),
  });

  res.json({ ok: true, result, events });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));