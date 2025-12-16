import express, { type Request, type Response } from "express";
import {
  defineIntent,
  runIntent,
  createOpenAIProvider,
  consoleTelemetrySink,
} from "fabricks-ai-reliability-layer";

const app = express();

app.use(express.static("public"));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

const providers = {
  openai: createOpenAIProvider({ apiKey }),
};

type AskMetadata = {
  route?: string;
  userAgent?: string;
  step1Output?: string;
};

const askIntent = defineIntent<{ question: string }, string>({
  name: "Call Open AI",
  steps: [
    {
      id: "step-1",
      timeoutMs: 10_000,
      retry: { maxAttemps: 3 },
      run: async (ctx) => {
        const response = await ctx.providers!.openai!.chat({
          prompt: ctx.input.question,
        });

        // stash step-1 output so step-2 can refine it
        ctx.metadata = {
          ...((ctx.metadata ?? {}) as AskMetadata),
          step1Output: response.content,
        };

        return response.content; // output of step-1
      },
    },
    {
      id: "step-2",
      timeoutMs: 8_000,
      retry: { maxAttemps: 2 },
      run: async (ctx) => {
        const meta = (ctx.metadata ?? {}) as AskMetadata;
        const step1Output = meta.step1Output;

        const response = await ctx.providers!.openai!.chat({
          prompt: `Answer briefly and safely:\n${step1Output ?? ctx.input.question}`,
        });

        return response.content; // final output of intent
      },
    },
  ],
  entryStepId: "step-1",
});

app.post("/ask", async (req: Request, res: Response) => {
  try {
    const question = (req.body as any)?.question;

    if (typeof question !== "string" || question.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Body must include { question: string }" });
    }

    const result = await runIntent(askIntent, {
      input: { question },
      providers,
      telemetry: consoleTelemetrySink,
      metadata: {
        route: "/ask",
        userAgent: req.get("user-agent") ?? undefined,
        step1Output: undefined,
      } satisfies AskMetadata,
    });

    if (!result.success) {
      return res.status(502).json({
        ok: false,
        error: "Intent failed",
        trace: result.trace,
      });
    }

    return res.json({
      ok: true,
      answer: result.output,
      trace: result.trace,
    });
  } catch (err) {
    console.error("Unhandled /ask error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log("Has OpenAI key:", !!process.env.OPENAI_API_KEY);
});
