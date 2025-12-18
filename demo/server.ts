import express, { type Request, type Response } from "express";
import { randomUUID } from "crypto";
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
  requestId?: string;
};

// ensures "fail once" persists across retry attempts (request-scoped)
const failedOnceByRequestId = new Set<string>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Normal demo intent: 2-step happy path + retry demo (synthetic fail-once).
 * NOTE: No timeout demo here because Heroku will H12 at 30s if you do 10s x 3 attempts.
 */
const askIntent = defineIntent<{ question: string }, string>({
  name: "Ask → Rewrite",
  steps: [
    {
      id: "primary_answer",
      timeoutMs: 10_000,
      retry: { maxAttemps: 3 }, // FIXED: maxAttemps -> maxAttemps
      run: async (ctx) => {
        const q = ctx.input.question.trim();
        const meta = (ctx.metadata ?? {}) as AskMetadata;

        // --- demo trigger: retry (fail exactly once per request) ---
        if (meta.mode === "retry" && meta.requestId) {
          if (!failedOnceByRequestId.has(meta.requestId)) {
            failedOnceByRequestId.add(meta.requestId);
            throw new Error("synthetic failure to demonstrate retry");
          }
        }
        // ----------------------------------------------------------

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
      retry: { maxAttemps: 2 }, // FIXED: maxAttemps -> maxAttemps
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

/**
 * Timeout demo intent: guaranteed to fail fast (<< 30s) so Heroku doesn't H12.
 * This is purely to show timeout telemetry in the HTTP JSON response.
 */
const askTimeoutIntent = defineIntent<{ question: string }, string>({
  name: "Ask → Rewrite (timeout demo)",
  steps: [
    {
      id: "primary_answer",
      timeoutMs: 2_000, // keep it fast
      retry: { maxAttemps: 1 }, // keep total < 30s (2s worst-case)
      run: async () => {
        // exceed timeoutMs on purpose
        await sleep(5_000);
        return "unreachable";
      },
    },
  ],
  entryStepId: "primary_answer",
});

app.post("/ask", async (req: Request, res: Response) => {
  const requestId = randomUUID();

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

    // Capture full telemetry so retry/timeout events are returned to the client
    const telemetryEvents: any[] = [];
    const telemetry = (e: any) => {
      telemetryEvents.push(e);
      consoleTelemetrySink(e); // keep Heroku logs
    };

    const intentToRun = mode === "timeout" ? askTimeoutIntent : askIntent;

    const result = await runIntent(intentToRun, {
      input: { question },
      providers,
      telemetry,
      metadata: {
        route: "/ask",
        userAgent: req.get("user-agent") ?? undefined,
        step1Output: undefined,
        mode,
        requestId,
      } satisfies AskMetadata,
    });

    if (!result.success) {
      return res.status(502).json({
        ok: false,
        error: "Intent failed",
        trace: telemetryEvents,
      });
    }

    return res.json({
      ok: true,
      answer: result.output,
      trace: telemetryEvents,
    });
  } catch (err) {
    console.error("Unhandled /ask error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error" });
  } finally {
    // prevent unbounded growth
    failedOnceByRequestId.delete(requestId);
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log("Has OpenAI key:", !!process.env.OPENAI_API_KEY);
});
