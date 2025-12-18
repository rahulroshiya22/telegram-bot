const { Markup } = require('telegraf');

const getMainMenu = () => Markup.inlineKeyboard([
    [Markup.button.callback('🤖 New Chat', 'mode_chat'), Markup.button.callback('🎨 Logo Gen', 'mode_logo')],
    [Markup.button.callback('🔄 Switch Model (GPT/Gemini)', 'toggle_model')],
    [Markup.button.callback('ℹ️ Help', 'show_help')],
    [Markup.button.url('📢 Join Airdrop Channel', 'https://t.me/AirdropJaguar')]
]);

const getModelsMenu = (models, currentModelId, page = 0) => {
    const ITEMS_PER_PAGE = 6;
    const totalPages = Math.ceil(models.length / ITEMS_PER_PAGE);

    // Ensure valid page
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentModels = models.slice(start, end);

    const buttons = currentModels.map(m => {
        const label = m.id === currentModelId ? `✅ ${m.name}` : m.name;
        // Shorten ID or use index if ID is too long for callback data? 
        // Telegram callback data max 64 bytes. IDs like "google/gemini..." are long.
        // We might need to send just the ID, but risk length limits. 
        // For now, let's assume it fits or rely on `select_model:` prefix + ID.
        // Some IDs are ~40 chars. `select_model:` is 13 chars. Total ~53. It fits tightly.
        return Markup.button.callback(label, `select_model:${m.id}`);
    });

    // Group text buttons
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
        keyboard.push(buttons.slice(i, i + 2));
    }

    // Pagination Controls
    const navRow = [];
    if (totalPages > 1) {
        // Prev
        if (page > 0) {
            navRow.push(Markup.button.callback('⬅️ Prev', `menu_model_page:${page - 1}`));
        } else {
            navRow.push(Markup.button.callback('⏹️', 'noop'));
        }

        // Indicator
        navRow.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));

        // Next
        if (page < totalPages - 1) {
            navRow.push(Markup.button.callback('Next ➡️', `menu_model_page:${page + 1}`));
        } else {
            navRow.push(Markup.button.callback('⏹️', 'noop'));
        }
        keyboard.push(navRow);
    }

    // Back button
    keyboard.push([Markup.button.callback('🔙 Back to Menu', 'back_home')]);

    return Markup.inlineKeyboard(keyboard);
};

module.exports = {
    getMainMenu,
    getModelsMenu
};
