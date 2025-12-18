const axios = require('axios');

class GoogleAIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.defaultModel = 'gemini-1.5-flash';
    }

    async chatCompletion(userMessage, systemInstruction = null) {
        try {
            // Construct payload
            // Google API doesn't support 'system' role in the same way as OpenAI in the simple API, 
            // but we can prepend it to the history or strictly standard usage.
            // For v1beta, system instructions are supported in specific ways or just pretended.
            // We will prepend the system instruction to the user message or use the system_instruction field if supported.
            // gemini-1.5-flash supports system_instruction.

            const payload = {
                contents: [
                    {
                        parts: [
                            { text: userMessage }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 1.0, // More creative/random
                    maxOutputTokens: 1000,
                    topP: 0.95,
                    topK: 40
                }
            };

            if (systemInstruction) {
                payload.system_instruction = {
                    parts: [
                        { text: systemInstruction }
                    ]
                };
            }

            const response = await axios.post(
                `${this.baseUrl}/${this.defaultModel}:generateContent?key=${this.apiKey}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.candidates && response.data.candidates.length > 0) {
                const candidate = response.data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts[0].text;
                }
            }

            return "❌ No response from Gemini.";

        } catch (error) {
            console.error('Google AI Error:', error.response ? JSON.stringify(error.response.data) : error.message);
            return "❌ Google AI Error: Service unavailable or key invalid.";
        }
    }
}

module.exports = GoogleAIService;
