const client = require('./whatsapp');
const { processQueryWithAI } = require('./botServiceAI');
const queue = require('./queue');
const memory = require('./memoryStore');
const fs = require('fs');
const path = require('path');

// Global Error Handlers para evitar crash silencioso
process.on('uncaughtException', (err) => {
    console.error('BOT FATAL ERROR:', err);
    if (process.send) process.send({ type: 'LOG', data: { role: 'system', content: `FATAL: ${err.message}`, contact: 'SYSTEM' } });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('BOT UNHANDLED REJECTION:', reason);
    if (process.send) process.send({ type: 'LOG', data: { role: 'system', content: `ERROR: ${reason}`, contact: 'SYSTEM' } });
});

// Caminho para dados compartilhados (o Electron/React vai escrever aqui)
const DATA_FILE = path.join(__dirname, '../data_snapshot.json');
const CONFIG_FILE = path.join(__dirname, '../data_config.json'); // Guarda API Key

let systemData = { owners: [], rentals: [] };
let configData = { apiKey: '', autoPilot: false };

// Carregar dados
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            systemData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
        if (fs.existsSync(CONFIG_FILE)) {
            configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("Erro ao carregar dados do bot:", e);
    }
}

// Inicializar
client.on('qr', (qr) => {
    // Envia QR para o processo pai (Electron)
    if (process.send) process.send({ type: 'QR_CODE', data: qr });
});

client.on('ready', () => {
    console.log('BOT: WhatsApp Conectado!');
    if (process.send) process.send({ type: 'STATUS', data: 'CONNECTED' });
});

const processedMsgIds = new Set();

client.on('message', async msg => {
    // 1. Proteção contra Duplicidade
    if (processedMsgIds.has(msg.id.id)) return;
    processedMsgIds.add(msg.id.id);
    setTimeout(() => processedMsgIds.delete(msg.id.id), 20000); // Limpa ID após 20s

    // 2. Proteção contra mensagens muito antigas (ghost event) ou vazias
    const messageAge = Date.now() / 1000 - msg.timestamp;
    if (messageAge > 120) return; // Ignora mensagens mais velhas que 2 minutos
    if (!msg.body || msg.body.trim().length === 0) return;

    loadData(); // Recarrega dados frescos a cada mensagem
    if (!configData.autoPilot) return; // Só responde se piloto automático estiver ligado

    const chatId = msg.from;

    // Ignora grupos, status e mensagens oficiais do WhatsApp
    if (chatId.includes('@g.us') || chatId === 'status@broadcast' || chatId === 'official') return;

    // Coloca na fila para processar sequencialmente
    queue.add(async () => {
        console.log(`BOT: Mensagem recebida de ${chatId}: ${msg.body}`);
        if (process.send) process.send({ type: 'LOG', data: { role: 'user', content: msg.body, contact: chatId } });

        const history = memory.get(chatId);

        // Simulação de delay humano (typing)
        const chat = await msg.getChat();
        await chat.sendStateTyping();
        await new Promise(r => setTimeout(r, 2000)); // 2s delay

        const now = new Date();
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

        const dateContext = {
            currentMonth: months[now.getMonth()],
            currentYear: now.getFullYear(),
            fullDate: now.toLocaleDateString('pt-BR'),
            dayOfWeek: weekDays[now.getDay()],
            time: now.toLocaleTimeString('pt-BR')
        };

        const result = await processQueryWithAI(msg.body,
            { ...systemData, ...dateContext },
            configData.apiKey,
            history
        );

        if (result.text) {
            await client.sendMessage(chatId, result.text);
            memory.save(chatId, msg.body, result.text);
            if (process.send) process.send({ type: 'LOG', data: { role: 'assistant', content: result.text, contact: chatId } });
        }

        // Processar Ações (ex: Criar Chamado)
        if (result.actions && result.actions.length > 0) {
            for (const action of result.actions) {
                if (action.name === 'CREATE_OCCURRENCE') {
                    // Envia comando para o Electron salvar no React State
                    if (process.send) process.send({ type: 'ACTION', action: action });

                    // Se tiver contato de ocorrência configurado, avisa
                    if (configData.occurrenceContact) {
                        const report = `🚨 *NOVO CHAMADO VIA IA*\n\nDe: ${chatId}\nProblema: ${action.params.description}\nUrgência: ${action.params.urgency}`;
                        await client.sendMessage(`${configData.occurrenceContact}@c.us`, report);
                    }
                }

                if (action.name === 'UPDATE_RENTAL') {
                    if (process.send) process.send({ type: 'ACTION', action: action });
                    await client.sendMessage(chatId, `✅ Atualização registrada.`);
                }
            }
        }

        await chat.clearState();
    });
});

// Listener para receber comandos do Electron
process.on('message', (msg) => {
    if (msg.type === 'UPDATE_DATA') {
        // Salva dados recebidos do React
        fs.writeFileSync(DATA_FILE, JSON.stringify(msg.data));
        systemData = msg.data;
    }
    if (msg.type === 'UPDATE_CONFIG') {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(msg.data));
        configData = msg.data;
    }
});

client.initialize();
