const store = new Map();

module.exports = {
    get: (chatId) => store.get(chatId) || [],
    save: (chatId, userMsg, botMsg) => {
        const history = store.get(chatId) || [];
        if (userMsg) history.push({ role: 'user', content: userMsg });
        if (botMsg) history.push({ role: 'assistant', content: botMsg });
        // Manter últimos 20 turns
        store.set(chatId, history.slice(-20));
    },
    initializeContext: (chatId, context) => {
        // Opcional: carregar histórico persistido de arquivo
    }
};
