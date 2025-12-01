"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAIProvider = createOpenAIProvider;
function createOpenAIProvider(config) {
    const { apiKey, baseUrl = "https://api.openai.com/v1", defaultModel = "gpt-4.1-mini", } = config;
    return {
        async chat(params) {
            const model = params.model ?? defaultModel;
            const prompt = params.prompt;
            const response = await fetch(`${baseUrl}/responses`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    input: prompt,
                }),
            });
            const data = await response.json();
            const content = data.output_text ??
                data.output?.[0]?.content?.[0]?.text ??
                "[empty response]";
            return { content };
        }
    };
}
