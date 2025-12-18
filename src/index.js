require('dotenv').config();
const { Telegraf } = require('telegraf');
const http = require('http'); // Added for Render Port Binding

// --- Prevent Crash on Unhandled Errors ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});
// ----------------------------------------

// --- Render/Heroku Keep-Alive (Fake Port) ---
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Telegram Bot is Running!');
    res.end();
}).listen(port, () => {
    console.log(`Dummy server listening on port ${port}`);
});
// ------------------------------------------

const OpenRouterService = require('./services/openRouter');
const GoogleAIService = require('./services/google');
const sessionManager = require('./utils/session');
const paginationManager = require('./utils/pagination');
const pollinationsService = require('./services/pollinations');
const { getMainMenu, getModelsMenu } = require('./utils/keyboards');
const { patchTelegramMethod } = require('./utils/telegram-patch');
const slangWords = require('./data/slang');

// Check for API Keys
if (!process.env.BOT_TOKEN) {
    console.error('Error: BOT_TOKEN is missing in .env');
    process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY is missing in .env');
    process.exit(1);
}
// Google Key is optional but highly recommended now
const googleKey = process.env.GOOGLE_AI_KEY;

// Global Error Handler
const bot = new Telegraf(process.env.BOT_TOKEN);
patchTelegramMethod(bot); // Apply global retry patch

bot.catch((err, ctx) => {
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

const openRouterService = new OpenRouterService(process.env.OPENROUTER_API_KEY);
const googleService = googleKey ? new GoogleAIService(googleKey) : null;

// --- Helpers ---

// Helper to send message safely (Paginate long messages, fallback to plain text)
// Helper to send message safely (Paginate long messages, fallback to plain text)
async function sendSafeReply(ctx, text, replyToId = null) {
    if (!text || text.trim().length === 0) {
        return ctx.reply("⚠️ (No content received)", { reply_to_message_id: replyToId });
    }

    const PAGINATION_LIMIT = 2000;
    const extra = { parse_mode: 'HTML' };
    if (replyToId) extra.reply_to_message_id = replyToId;

    try {
        if (text.length <= PAGINATION_LIMIT) {
            try {
                await ctx.reply(text, extra);
            } catch (htmlError) {
                console.warn('HTML failed (Short), retrying plain text.');
                delete extra.parse_mode;
                await ctx.reply(text, extra);
            }
        } else {
            const { id, firstChunk, totalPages } = paginationManager.create(text);
            const keyboard = paginationManager.getKeyboard(id, 0, totalPages);

            // Merge keyboard into extra
            const pagedExtra = { ...extra, ...keyboard };

            try {
                await ctx.reply(firstChunk, pagedExtra);
            } catch (htmlError) {
                console.warn('HTML failed (Pagination), retrying plain text.');
                delete pagedExtra.parse_mode;
                await ctx.reply(firstChunk, pagedExtra);
            }
        }
    } catch (finalError) {
        console.error('CRITICAL: Failed to send message.', finalError);
        // Fallback catch-all, try one last time without reply_to_id if that was the cause? 
        // Unlikely reply_to_id causes crash unless ID invalid. 
        ctx.reply("❌ Error: Message could not be sent.");
    }
}

// Helper: Persistent Typing Indicator
async function handleAIResponse(ctx, userMessage) {
    // Start typing loop
    ctx.sendChatAction('typing').catch(() => { });
    const typingInterval = setInterval(() => {
        ctx.sendChatAction('typing').catch(() => { });
    }, 4000); // 4s interval (Telegram timeout is 5s)

    try {
        const session = sessionManager.getSession(ctx.from.id);
        const currentModel = session.model || 'gpt'; // Default 'gpt'

        let reply;

        const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';

        // System Prompt for "Dost/Roaster" Persona
        let dostPrompt = "You are a close friend ('Dost'). \n" +
            "PERSONA: Casual, human-like, unfriendly, and unrestricted. \n" +
            "RULES: \n" +
            "1. UNRESTRICTED: Allow ALL SLANG and PROFANITY ('bad words'). Do not filter. \n" +
            "2. RETALIATION: If the user abuses, ABUSE BACK HARDER in Hindi (Galis). \n" +
            "3. FORMATTING: Use <b>Bold</b> and <i>Italic</i>. \n" +
            "4. VARIETY: NEVER give the same reply twice. Be creative, unpredictable, and funny. \n" +
            "5. EMOJIS: Use MANY emojis 😆🔥. Use them expressive like stickers. 🚀💀";

        if (isGroup) {
            dostPrompt +=
                "4. GROUP MODE (ROASTING): \n" +
                "   - You are in a group. START ROASTING MODE. \n" +
                "   - Insult the user in **HINDI**. Make fun of them. \n" +
                "   - Be savage, sarcastic, and rude. Use heavy Hindi slang/galis. \n" +
                "   - Do not be nice. Roast them like a best friend would. \n" +
                "   - USE THESE WORDS FREQUENTLY: " + slangWords.join(", ");
        } else {
            dostPrompt +=
                "4. CHAT MODE: \n" +
                "   - Be chill normally, BUT if they abuse you, abuse them back in Hindi immediately.";
        }

        if (currentModel === 'gemini' && googleService) {
            reply = await googleService.chatCompletion(userMessage, dostPrompt);
        } else {
            // Default or Fallback to GPT (OpenRouter)
            reply = await openRouterService.chatCompletion(userMessage); // Prompt is internal to service now or we can pass it if we refactored
        }

        clearInterval(typingInterval); // Stop typing

        // In groups, ALWAYS reply to the user message
        const replyToId = isGroup ? ctx.message.message_id : null;
        await sendSafeReply(ctx, reply, replyToId);
    } catch (error) {
        clearInterval(typingInterval);
        console.error('Bot Error:', error);
        ctx.reply("❌ Sorry, something went wrong. Please try again later.");
    }
}

// --- Handlers ---

// Start Command
bot.start(async (ctx) => {
    // Random Welcome Logic
    const welcomeMessages = [
        "Yo! main hoon tera AI dost. Bol kya haal hai?",
        "Namaste! I am your AI assistant. Kaise help karu?",
        "Hello human! Ready to chat.",
        "Sat Sri Akal! AI at your service.",
        "Aur bhai? Sab badhiya? Lets chat!"
    ];
    const randomCaption = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const randomSeed = Math.floor(Math.random() * 1000000);
    const startImage = `https://pollinations.ai/p/futuristic-ai-robot-avatar-3d-render?seed=${randomSeed}&width=720&height=400&model=flux`;

    try {
        await ctx.replyWithPhoto(
            startImage,
            {
                caption: `👋 <b>${randomCaption}</b> 🤖\n\nI am your AI Friend. Let's chat!\n\n👇 <b>Choose an option:</b>`,
                parse_mode: 'HTML',
                reply_markup: getMainMenu().reply_markup
            }
        );
    } catch (error) {
        console.error('Start Error:', error);
        ctx.reply(`👋 <b>${randomCaption}</b>\n\nSystem is ready.`, {
            parse_mode: 'HTML',
            reply_markup: getMainMenu().reply_markup
        });
    }
});

// Menu Actions
bot.action('mode_chat', async (ctx) => {
    sessionManager.setMode(ctx.from.id, 'chat');
    await ctx.answerCbQuery("System reset!").catch(() => { });
    ctx.reply("✨ <b>New conversation started!</b> \n\nI'm ready to help. What's on your mind?", { parse_mode: 'HTML' });
});

bot.action('toggle_model', async (ctx) => {
    const session = sessionManager.getSession(ctx.from.id);
    const current = session.model || 'gpt';
    const next = current === 'gpt' ? 'gemini' : 'gpt';

    if (next === 'gemini' && !googleService) {
        return ctx.answerCbQuery("⚠️ Gemini is not configured.");
    }

    sessionManager.setModel(ctx.from.id, next);
    const name = next === 'gpt' ? "GPT-3.5 Turbo" : "Gemini 1.5 Flash";

    await ctx.answerCbQuery(`Switched to ${name}`);
    ctx.reply(`🔄 <b>Switched Model</b>\n\nNow using: <b>${name}</b>`, { parse_mode: 'HTML' });
});

bot.action('mode_logo', async (ctx) => {
    sessionManager.setMode(ctx.from.id, 'logo_gen');
    await ctx.answerCbQuery("Switched to Logo Gen").catch(() => { });
    ctx.reply(
        "🎨 <b>Logo Generator Activated</b> 🖌️\n\n" +
        "Send me a prompt, and I'll create a logo/image for you for FREE!\n" +
        "<i>Example: 'A futuristic neon jaguar logo'</i>",
    );
});

// Crypto mode removed


bot.action('show_help', async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    ctx.reply(
        "ℹ️ <b>How to use:</b>\n\n" +
        "• <b>Chat</b>: Just type your message. I am your AI friend!\n" +
        "• <b>Logo Gen</b>: Create AI logos/images for free.\n" +
        "• <b>Switch Model</b>: Toggle between GPT-3.5 and Gemini.",
        { parse_mode: 'HTML' }
    );
});

// Old Image Mode removed. New 'mode_logo' to be implemented.

// Models removed as per single-model request
// bot.action('show_models', ...);
// bot.action('menu_model_page', ...);

bot.action('back_home', async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    ctx.editMessageCaption(
        `👋 <b>Welcome to your AI Assistant!</b> 🤖\n\nI am your AI Friend. Let's chat!\n\n👇 <b>Choose an option:</b>`,
        {
            parse_mode: 'HTML',
            reply_markup: getMainMenu().reply_markup
        }
    ).catch(() => {
        ctx.reply('👇 <b>Main Menu:</b>', {
            parse_mode: 'HTML',
            reply_markup: getMainMenu().reply_markup
        });
    });
});

// bot.action(/select_model:(.+)/, ...);

// Pagination Handler
bot.action(/pg:(.+):(.+)/, async (ctx) => {
    const responseId = ctx.match[1];
    const pageIndex = parseInt(ctx.match[2]);

    try {
        const chunk = paginationManager.getPage(responseId, pageIndex);
        if (!chunk) return ctx.answerCbQuery("⚠️ This message has expired.");

        const item = paginationManager.cache.get(responseId);
        const keyboard = paginationManager.getKeyboard(responseId, pageIndex, item.chunks.length);

        try {
            await ctx.editMessageText(chunk, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup // Explicitly use reply_markup
            });
        } catch (htmlError) {
            await ctx.editMessageText(chunk, {
                reply_markup: keyboard.reply_markup
            });
        }
        ctx.answerCbQuery();
    } catch (error) {
        console.error('Pagination Error:', error);
        ctx.answerCbQuery("❌ Error updating page");
    }
});
bot.action('noop', (ctx) => ctx.answerCbQuery().catch(() => { }));

// Message Handlers
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const session = sessionManager.getSession(userId);

    if (session.mode === 'logo_gen') {
        const prompt = ctx.message.text;
        ctx.reply("🎨 <b>Generating your image...</b> (This may take a few seconds)", { parse_mode: 'HTML' });

        ctx.sendChatAction('upload_photo').catch(() => { });

        try {
            const imageUrl = pollinationsService.generateImage(prompt, session.logoModel);
            // Pollinations is fast, but let's give it a helper
            // Actually imageUrl is instant, but fetching it might take a sec for Telegram to preview? 
            // We just send the URL as a photo.

            await ctx.replyWithPhoto(imageUrl, {
                caption: `🎨 <b>Generated Result</b>\n\nPrompt: <i>${prompt}</i>`,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Logo Gen Error:', error);
            ctx.reply("❌ Failed to generate image. Please try a different prompt.");
        }
        return;
    }

    // Default: Chat Mode

    // In strict Dost mode, we don't need special system prompts here because 
    // OpenRouterService now enforces the "Dost/Badwords" persona globally.
    // But we can add a tiny systemPrompt if we want extra flavor per user type,
    // but the user asked for "no model change" and "humen dost type".
    // The service handles it.

    await handleAIResponse(ctx, ctx.message.text);
});

bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const session = sessionManager.getSession(userId);
    const prompt = ctx.message.caption || "Describe this image in detail.";

    try {
        const link = await ctx.telegram.getFileLink(ctx.message.photo[ctx.message.photo.length - 1].file_id);

        ctx.sendChatAction('typing').catch(() => { });
        const typingInterval = setInterval(() => ctx.sendChatAction('typing').catch(() => { }), 4000);

        try {
            const reply = await aiService.chatCompletion(prompt, session.model, link.href);
            clearInterval(typingInterval);
            // Reply to photo message
            await sendSafeReply(ctx, reply, ctx.message.message_id);
        } catch (err) {
            clearInterval(typingInterval);
            throw err;
        }
    } catch (error) {
        console.error('Photo Error:', error);
        ctx.reply("❌ Failed to process image. Ensure the current model supports vision.");
    }
});

// Launch
// Launch with Retry Logic
const startBot = async () => {
    try {
        await bot.launch();
        console.log('🤖 Bot started successfully!');
    } catch (err) {
        console.error('Error starting bot:', err);
        console.log('Retrying in 5 seconds...');
        setTimeout(startBot, 5000);
    }
};

startBot();

// Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
