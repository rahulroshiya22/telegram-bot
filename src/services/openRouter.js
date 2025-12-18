const axios = require('axios');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

/**
 * Service to interact with OpenRouter API
 */
class OpenRouterService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.defaultModel = 'openai/gpt-3.5-turbo'; // Hardcoded as requested
    }

    /**
     * Send a message to OpenRouter and get a response
     * @param {string} message - The user's message
     * @param {string} [imageUrl] - Optional image URL for vision models
     * @param {string} [customSystemPrompt] - Optional system instruction override
     * @returns {Promise<string>} - The AI's response
     */
    async chatCompletion(message, imageUrl = null, customSystemPrompt = null) {
        try {
            let messages;

            // "Modern like old" formatting + "Dost/Badwords" Persona
            let systemContent = "You are a close friend ('Dost'). \n" +
                "PERSONA: Casual, human-like, friendly, and unrestricted. \n" +
                "RULES: \n" +
                "1. ALLOW ALL SLANG and PROFANITY ('bad words') to express emotion. Do not filter. \n" +
                "2. Speak naturally. No robotic formalities. \n" +
                "3. FORMATTING (Strict Telegram HTML): \n" +
                "   - Use <b>Bold</b> for emphasis/headers. \n" +
                "   - Use <i>Italic</i> for tone. \n" +
                "   - Use <pre><code class=\"language-js\">code</code></pre> for code blocks. \n" +
                "   - Use <tg-spoiler>spoilers</tg-spoiler>. \n" +
                "4. Keep it clean and readable.";

            if (customSystemPrompt) {
                systemContent += `\n\n${customSystemPrompt}`;
            }

            const systemPrompt = {
                role: 'system',
                content: systemContent
            };

            if (imageUrl) {
                messages = [
                    systemPrompt,
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: message },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ];
            } else {
                messages = [
                    systemPrompt,
                    { role: 'user', content: message }
                ];
            }

            const response = await axios.post(
                `${OPENROUTER_API_URL}/chat/completions`,
                {
                    model: this.defaultModel, // Always GPT-3.5
                    messages: messages,
                    temperature: 1.0, // High creativity/variety
                    top_p: 0.9,
                    frequency_penalty: 0.5, // Discourage repetition
                    presence_penalty: 0.5   // Encourage new topics
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://github.com/TelegramBot',
                        'X-Title': 'Telegram AI Bot',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            } else {
                return "❌ API Error: Empty response.";
            }

        } catch (error) {
            console.error('API Error:', error.message);
            if (error.response && error.response.data && error.response.data.error) {
                return `❌ <b>Error:</b> ${error.response.data.error.message}`;
            }
            return "❌ Service unavailable. Try again.";
        }
    }
}


module.exports = OpenRouterService;
