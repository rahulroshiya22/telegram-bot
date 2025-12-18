const { Markup } = require('telegraf');

class PaginationManager {
    constructor() {
        this.cache = new Map();
        this.CHUNK_SIZE = 2000; // Safe limit for Telegram messages with markup
        this.EXPIRY_MS = 60 * 60 * 1000; // 1 hour expiry
    }

    /**
     * Create a new paginated response with smart HTML code block handling
     * @param {string} text - Full text to paginate (HTML)
     * @returns {object} - { id, firstChunk, totalPages }
     */
    create(text) {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

        const chunks = [];
        let remaining = text;
        let openPreBlock = null; // Track if we are inside a <pre> block (and its class)

        while (remaining.length > 0) {
            let limit = this.CHUNK_SIZE;

            // Reserve space for opening/closing tags if continuing
            if (openPreBlock) limit -= 40;

            let chunkText;
            if (remaining.length <= limit) {
                chunkText = remaining;
                remaining = '';
            } else {
                // Find split point (try newline first, then space)
                // Avoid splitting inside tags if possible is hard, but we assume "nice" HTML from AI
                let splitIndex = remaining.lastIndexOf('\n', limit);
                if (splitIndex === -1 || splitIndex < limit * 0.7) {
                    splitIndex = remaining.lastIndexOf(' ', limit); // Fallback to space
                }
                if (splitIndex === -1) splitIndex = limit; // Hard split

                chunkText = remaining.substring(0, splitIndex);
                remaining = remaining.substring(splitIndex);
            }

            // --- HTML Fixup Logic ---

            // 1. Handle Prepend (if continuing a block)
            if (openPreBlock) {
                chunkText = `${openPreBlock}${chunkText}`;
            }

            // 2. Check state at end of this chunk
            const preStarts = (chunkText.match(/<pre/g) || []).length;
            const preEnds = (chunkText.match(/<\/pre>/g) || []).length;
            // Since we prepended `openPreBlock` (which contains a <pre>), the counts should balance if closed.
            // Wait, if `openPreBlock` is set, we added one <pre>.
            // So if `preStarts > preEnds`, we are open.

            if (preStarts > preEnds) {
                // We are stuck inside a <pre>. We need to close it for this chunk.

                // Find the LAST opening tag to extract class for the next chunk
                const match = chunkText.match(/<pre[^>]*><code[^>]*>/g) || chunkText.match(/<pre>/g);
                const lastTag = match ? match[match.length - 1] : '<pre><code>';

                openPreBlock = lastTag; // Save for next chunk
                chunkText += '</code></pre>'; // Close for current chunk
            } else {
                openPreBlock = null;
            }

            chunks.push(chunkText);
        }

        this.cache.set(id, {
            chunks,
            page: 0,
            timestamp: Date.now()
        });

        this.cleanup();

        return {
            id,
            firstChunk: chunks[0],
            totalPages: chunks.length
        };
    }

    /**
     * Get a specific page
     * @param {string} id - Response ID
     * @param {number} pageIndex - 0-based index
     * @returns {string|null} - Chunk content or null if expired/invalid
     */
    getPage(id, pageIndex) {
        const item = this.cache.get(id);
        if (!item) return null;

        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex >= item.chunks.length) pageIndex = item.chunks.length - 1;

        item.page = pageIndex; // Update current view state (optional tracking)
        return item.chunks[pageIndex];
    }

    /**
     * Generate keyboard markup for navigation
     * @param {string} id 
     * @param {number} currentPage (0-based)
     * @param {number} totalPages 
     */
    getKeyboard(id, currentPage, totalPages) {
        if (totalPages <= 1) return null;

        const buttons = [];

        // Prev Button
        if (currentPage > 0) {
            buttons.push(Markup.button.callback('⬅️', `pg:${id}:${currentPage - 1}`));
        } else {
            buttons.push(Markup.button.callback('⏹️', 'noop')); // Placeholder
        }

        // Page Indicator
        buttons.push(Markup.button.callback(`${currentPage + 1}/${totalPages}`, 'noop'));

        // Next Button
        if (currentPage < totalPages - 1) {
            buttons.push(Markup.button.callback('➡️', `pg:${id}:${currentPage + 1}`));
        } else {
            buttons.push(Markup.button.callback('⏹️', 'noop')); // Placeholder
        }

        return Markup.inlineKeyboard([buttons]);
    }

    cleanup() {
        const now = Date.now();
        for (const [id, item] of this.cache.entries()) {
            if (now - item.timestamp > this.EXPIRY_MS) {
                this.cache.delete(id);
            }
        }
    }
}

module.exports = new PaginationManager();
