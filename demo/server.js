import { defineIntent, runIntent } from "fabricks-ai-reliability-layer";
import { createOpenAIProvider } from "fabricks-ai-reliability-layer/dist/providers/openai";
import { consoleTelemetrySink } from "fabricks-ai-reliability-layer/dist/core/telemetry";
import express from "express";

console.log("Has OpenAI key:", !!process.env.OPENAI_API_KEY);


const app = express();

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));


app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  
  app.use(express.json());

  app.post("/api/echo-trace", (req, res) => {
    const events = [];
  
    // simulate telemetry events
    events.push({ type: "request_received", at: Date.now() });
    events.push({ type: "request_body", body: req.body, at: Date.now() });
  
    res.json({ ok: true, events });
  });

  const helloIntent = defineIntent({
    name: "hello-intent",
    steps: [
      {
        id: "hello",
        run: async () => "OK",
      },
    ],
    entryStepId: "hello",
  });
  
  app.post("/api/run/hello", async (_req, res) => {
    const events = [];
  
    const result = await runIntent(helloIntent, {
      input: {},
      providers: {},
      telemetry: (e) => events.push(e),
    });
  
    res.json({ ok: true, result, events });
  });
  

