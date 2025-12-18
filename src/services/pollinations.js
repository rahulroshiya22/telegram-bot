const axios = require('axios');

/**
 * Service to interact with Pollinations.ai for free image generation
 */
class PollinationsService {
    constructor() {
        this.baseUrl = 'https://pollinations.ai/p/';
        this.defaultModel = 'flux'; // 'flux', 'turbo', 'pixart', 'deliberate'
    }

    /**
     * Generate an image URL for a given prompt
     * @param {string} prompt - The text description
     * @param {string} model - The model to use (flux, turbo, etc.)
     * @returns {string} - The direct URL to the generated image
     */
    generateImage(prompt, model = this.defaultModel) {
        const encodedPrompt = encodeURIComponent(prompt);
        const randomSeed = Math.floor(Math.random() * 1000000);

        // Pollinations URL format: https://pollinations.ai/p/{prompt}?model={model}&width={w}&height={h}&seed={seed}
        return `${this.baseUrl}${encodedPrompt}?model=${model}&width=1024&height=1024&seed=${randomSeed}`;
    }
}

module.exports = new PollinationsService();
