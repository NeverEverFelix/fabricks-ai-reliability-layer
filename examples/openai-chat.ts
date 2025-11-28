import { createOpenAIProvider } from "../src";
import { defineIntent } from "../src";
import { runIntent } from "../src";

const intent = defineIntent({
    name:"openAI",
    steps: [
        {
            id:"api call",
            run: async (ctx) ()=> {
                await createOpenAIProvider
            },
        }
    ]

})