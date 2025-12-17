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

type AskMode = "retry" | "timeout";

type AskMetadata = {
  route?: string;
  userAgent?: string;
  step1Output?: string;

  // demo controls
  mode?: AskMode;
  retryFailOnce?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const askIntent = defineIntent<{ question: string }, string>({
  name: "Ask → Rewrite",
  steps: [
    {
      id: "primary_answer",
      timeoutMs: 10_000,
      retry: { maxAttemps: 3 }, // NOTE: fixed typo (maxAttemps -> maxAttemps)
      run: async (ctx) => {
        const q = ctx.input.question.trim();
        const meta = (ctx.metadata ?? {}) as AskMetadata;

        // --- demo triggers (no fallback; just make retry/timeout visible) ---
        if (meta.mode === "retry" && meta.retryFailOnce !== true) {
          ctx.metadata = { ...meta, retryFailOnce: true };
          throw new Error("synthetic failure to demonstrate retry");
        }

        if (meta.mode === "timeout") {
          // exceed timeoutMs (10s)
          await sleep(12_000);
        }
        // ---------------------------------------------------------------

        const response = await ctx.providers!.openai!.chat({
          prompt: [
            "Answer the question in EXACTLY 1 sentence.",
            'Do NOT include a preface like "Sure", "Correct", or "Answer:".',
            "Do NOT add bullet points or extra sentences.",
            "",
            `Question: ${q}`,
          ].join("\n"),
        });

        const oneSentence = response.content.trim();

        // stash step-1 output so step-2 can refine it
        ctx.metadata = {
          ...meta,
          step1Output: oneSentence,
        };

        return oneSentence;
      },
    },
    {
      id: "rewrite_5_words",
      timeoutMs: 8_000,
      retry: { maxAttemps: 2 }, // NOTE: fixed typo
      run: async (ctx) => {
        const meta = (ctx.metadata ?? {}) as AskMetadata;
        const oneSentence = (meta.step1Output ?? "").trim();

        const response = await ctx.providers!.openai!.chat({
          prompt: [
            "Rewrite the text into EXACTLY 5 words.",
            "Return ONLY the 5 words.",
            "No punctuation. No quotes. No extra text.",
            "",
            `Text: ${oneSentence}`,
          ].join("\n"),
        });

        return response.content.trim();
      },
    },
  ],
  entryStepId: "primary_answer",
});

app.post("/ask", async (req: Request, res: Response) => {
  try {
    const question = (req.body as any)?.question;
    const modeRaw = (req.body as any)?.mode;

    if (typeof question !== "string" || question.trim().length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Body must include { question: string }" });
    }

    const mode: AskMode | undefined =
      modeRaw === "retry" || modeRaw === "timeout" ? modeRaw : undefined;

    const result = await runIntent(askIntent, {
      input: { question },
      providers,
      telemetry: consoleTelemetrySink,
      metadata: {
        route: "/ask",
        userAgent: req.get("user-agent") ?? undefined,
        step1Output: undefined,

        mode,
        retryFailOnce: false,
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
