
const { Telegraf } = require('telegraf');

/**
 * Patches the Telegram bot instance to add global retry logic for:
 * 1. 429 Too Many Requests (Rate Limits)
 * 2. Network Timeouts (ETIMEDOUT, ECONNRESET, etc.)
 * 
 * @param {Telegraf} bot - The Telegraf bot instance
 */
function patchTelegramMethod(bot) {
    const originalCallApi = bot.telegram.callApi.bind(bot.telegram);

    bot.telegram.callApi = async function (method, payload, { signal } = {}) {
        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt <= MAX_RETRIES) {
            try {
                return await originalCallApi(method, payload, { signal });
            } catch (error) {
                attempt++;
                const isRateLimit = error.code === 429;
                const isNetworkError = ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'EPIPE'].includes(error.code) ||
                    (error.message && error.message.includes('ETIMEDOUT'));

                if (attempt > MAX_RETRIES || (!isRateLimit && !isNetworkError)) {
                    throw error;
                }

                let delay = 1000 * attempt; // Default exponential backoff: 1s, 2s, 3s

                if (isRateLimit) {
                    const retryAfter = error.parameters?.retry_after;
                    // If retry_after is provided, use it (plus a small buffer), otherwise default logic
                    delay = retryAfter ? (retryAfter * 1000) + 500 : 5000;
                    console.warn(`[API] 429 Rate Limit hit. Method: ${method}. Retrying in ${delay}ms...`);
                } else {
                    console.warn(`[API] Network Error (${error.code}). Method: ${method}. Retrying in ${delay}ms...`);
                }

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
}

module.exports = { patchTelegramMethod };
