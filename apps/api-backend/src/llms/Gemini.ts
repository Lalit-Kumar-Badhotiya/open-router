import { Messages } from "../types";
import { BaseLlm, LlmResponse } from "./Base";
import { GoogleGenAI } from "@google/genai";

// Constructed lazily so the server can boot without provider keys configured;
// a missing key only fails when a request to that provider is actually made.
let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    if (!ai) {
        ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY ?? ""
        });
    }
    return ai;
}

export class Gemini extends BaseLlm {
    static async chat(model: string, messages: Messages): Promise<LlmResponse> {
        const response = await getClient().models.generateContent({
            model: model,
            contents: messages.map(message => ({
                text: message.content,
                role: message.role
            }))
        });

        return {
            outputTokensConsumed: response.usageMetadata?.candidatesTokenCount!,
            inputTokensConsumed: response.usageMetadata?.promptTokenCount!,
            completions: {
                choices: [{
                    message: {
                        content: response.text!
                    }
                }]
            }
        }
    }
}