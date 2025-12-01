import { defineIntent } from "../src/core/intent";
import { runIntent } from "../src/core/engine";
import { consoleTelemetrySink } from "../src/core/telemetry";
async function main() {
    const intent = defineIntent({
        name: "timeout_test_intent",
        steps: [
            {
                id: "slow_step",
                timeoutMs: 500, // short timeout for testing
                run: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    return "OK";
                },
            },
        ],
    });
    const result = await runIntent(intent, {
        input: null,
        telemetry: consoleTelemetrySink, // <-- SEE TIMEOUT EVENTS LIVE
    });
    console.log("\n--- FINAL RESULT ---");
    console.dir(result, { depth: null });
}
main();
