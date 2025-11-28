import { defineIntent } from "../src";
import { runIntent } from "../src";
import { consoleTelemetrySink } from "../src/core/telemetry";
import { OpenAIProviderClient } from "../src/types";

const intent = defineIntent({
    name: "Test intet",
    steps: [
        {
            id:"fist step",
            timeoutMs:500,
            run: async(ctx)=> {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return "OK"
            },
        },
    ],
});
async function main(){
    const result = await runIntent(intent,{
        input:undefined,
        providers:{},
        telemetry:consoleTelemetrySink
    })
    console.log("Execution Log",result);
}

main().catch(console.error);