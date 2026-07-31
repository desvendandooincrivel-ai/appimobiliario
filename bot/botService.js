const client = require('./whatsapp');
const { processQueryWithAI } = require('./botServiceAI');
const queue = require('./queue');
const memory = require('./memoryStore');
const fs = require('fs');
const path = require('path');

// ── LOG FILE (para diagnóstico mesmo sem terminal visível) ──
const LOG_FILE = path.join(__dirname, '../bot_debug.log');
function writeLog(msg) {
    const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}\n`;
    try { fs.appendFileSync(LOG_FILE, line); } catch (_) {}
    console.log(msg);
}
// Limpa log antigo ao iniciar
try { fs.writeFileSync(LOG_FILE, `=== BOT INICIADO em ${new Date().toLocaleString('pt-BR')} ===\n`); } catch (_) {}

writeLog('BOT: Carregando dependências e iniciando motor de IA...');

// Global Error Handlers para evitar crash silencioso
process.on('uncaughtException', (err) => {
    writeLog(`BOT FATAL ERROR: ${err.message}\n${err.stack}`);
    if (process.send) process.send({ type: 'LOG', data: { role: 'system', content: `FATAL: ${err.message}`, contact: 'SYSTEM' } });
});

process.on('unhandledRejection', (reason, promise) => {
    writeLog(`BOT UNHANDLED REJECTION: ${reason}`);
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
        writeLog(`Erro ao carregar dados do bot: ${e.message}`);
    }
}

// Inicializar
client.on('qr', (qr) => {
    writeLog('BOT: QR Code recebido, pronto para escaneamento.');
    if (process.send) process.send({ type: 'QR_CODE', data: qr });
});

client.on('authenticated', () => {
    writeLog('BOT: Autenticado com sucesso!');
    if (process.send) process.send({ type: 'STATUS', data: 'AUTHENTICATED' });
});

client.on('auth_failure', (msg) => {
    writeLog(`BOT: Falha na autenticação: ${msg}`);
    if (process.send) process.send({ type: 'STATUS', data: 'DISCONNECTED' });
});

client.on('disconnected', (reason) => {
    writeLog(`BOT: Desconectado: ${reason}`);
    if (process.send) process.send({ type: 'STATUS', data: 'DISCONNECTED' });
});

let isReady = false;
client.on('ready', () => {
    isReady = true;
    writeLog('BOT: ✅ WhatsApp Conectado e Pronto! Aguardando mensagens...');
    if (process.send) process.send({ type: 'STATUS', data: 'CONNECTED' });
});

const processedMsgIds = new Set();

client.on('message', async msg => {
    writeLog(`[DEBUG] Evento 'message': from=${msg.from}, body=${msg.body}`);

    // 1. Proteção contra Duplicidade
    if (processedMsgIds.has(msg.id.id)) {
        writeLog(`[DEBUG] Msg duplicada ignorada: ${msg.id.id}`);
        return;
    }
    processedMsgIds.add(msg.id.id);
    setTimeout(() => processedMsgIds.delete(msg.id.id), 20000);

    // 2. Proteção contra mensagens muito antigas (ghost event) ou vazias
    const messageAge = Date.now() / 1000 - msg.timestamp;
    writeLog(`[DEBUG] Idade da mensagem: ${messageAge.toFixed(0)}s`);
    if (messageAge > 120) {
        writeLog(`[DEBUG] Mensagem ignorada (muito antiga: ${messageAge.toFixed(0)}s)`);
        return;
    }
    if (!msg.body || msg.body.trim().length === 0) {
        writeLog(`[DEBUG] Mensagem ignorada (body vazio)`);
        return;
    }

    const chatId = msg.from;

    // Ignora grupos, status e mensagens oficiais do WhatsApp
    if (chatId.includes('@g.us') || chatId === 'status@broadcast' || chatId === 'official') {
        writeLog(`[DEBUG] Mensagem ignorada (grupo/status): ${chatId}`);
        return;
    }

    writeLog(`BOT: ✅ Mensagem aceita de ${chatId}: ${msg.body}`);
    // SEMPRE envia o LOG da mensagem recebida para a interface do Electron
    if (process.send) process.send({ type: 'LOG', data: { role: 'user', content: msg.body, contact: chatId } });

    loadData(); // Recarrega dados frescos a cada mensagem
    writeLog(`[DEBUG] autoPilot: ${configData.autoPilot}, apiKey: ${configData.apiKey ? configData.apiKey.substring(0,10)+'...' : 'NÃO DEFINIDA'}`);

    if (!configData.autoPilot) {
        writeLog(`BOT: Piloto automático DESLIGADO. Mensagem apenas registrada.`);
        return;
    }

    // Coloca na fila para processar sequencialmente
    queue.add(async () => {
        writeLog(`[DEBUG] Processando mensagem na fila de ${chatId}...`);
        const history = memory.get(chatId);

        // Simulação de delay humano (typing)
        try {
            const chat = await msg.getChat();
            await chat.sendStateTyping();
        } catch (e) {
            writeLog(`[DEBUG] Erro ao enviar typing state: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 1500));

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

        writeLog(`[DEBUG] Chamando IA com chave: ${configData.apiKey ? configData.apiKey.substring(0,10)+'...' : 'NÃO DEFINIDA'}`);
        let result;
        try {
            result = await processQueryWithAI(msg.body,
                { ...systemData, ...dateContext },
                configData.apiKey,
                history
            );
            writeLog(`[DEBUG] Resposta da IA: ${JSON.stringify(result).substring(0, 300)}`);
        } catch (aiErr) {
            writeLog(`[DEBUG] ERRO na chamada da IA: ${aiErr.message}`);
            result = { text: 'Desculpe, tive um problema técnico. Tente novamente em alguns instantes.' };
        }

        if (result.text) {
            writeLog(`[DEBUG] Enviando resposta ao WhatsApp de ${chatId}...`);
            await client.sendMessage(chatId, result.text);
            memory.save(chatId, msg.body, result.text);
            if (process.send) process.send({ type: 'LOG', data: { role: 'assistant', content: result.text, contact: chatId } });
            writeLog(`[DEBUG] ✅ Resposta enviada com sucesso!`);
        } else {
            writeLog(`[DEBUG] IA não retornou texto. result: ${JSON.stringify(result)}`);
        }

        // Processar Ações (ex: Criar Chamado)
        if (result.actions && result.actions.length > 0) {
            for (const action of result.actions) {
                if (action.name === 'CREATE_OCCURRENCE') {
                    writeLog(`BOT: Executando ação CREATE_OCCURRENCE: ${JSON.stringify(action.params)}`);
                    if (process.send) process.send({ type: 'ACTION', action: action });

                    // Se tiver contato de ocorrência configurado, avisa
                    if (configData.occurrenceContact) {
                        const rawContact = String(configData.occurrenceContact).replace(/\D/g, '');
                        if (rawContact.length >= 10) {
                            const formattedContact = rawContact.startsWith('55') ? rawContact : `55${rawContact}`;
                            const tenantNumber = chatId.replace('@c.us', '');
                            const report = `🚨 *NOVO CHAMADO VIA IA*\n\nDe: ${tenantNumber}\nProblema: ${action.params.description}\nUrgência: ${action.params.urgency || 'média'}`;
                            writeLog(`BOT: Enviando alerta ao responsável (${formattedContact})...`);
                            await client.sendMessage(`${formattedContact}@c.us`, report).catch(e => writeLog(`BOT: Erro ao notificar responsável: ${e.message}`));
                        } else {
                            writeLog(`[DEBUG] occurrenceContact inválido: "${configData.occurrenceContact}" (raw: "${rawContact}")`);
                        }
                    } else {
                        writeLog(`[DEBUG] Nenhum occurrenceContact configurado. Chamado criado mas sem notificação.`);
                    }
                }

                if (action.name === 'UPDATE_RENTAL') {
                    if (process.send) process.send({ type: 'ACTION', action: action });
                    await client.sendMessage(chatId, `✅ Atualização registrada.`);
                }
            }
        }
    });
});

// Listener para receber comandos do Electron
process.on('message', (msg) => {
    if (msg.type === 'UPDATE_DATA') {
        fs.writeFileSync(DATA_FILE, JSON.stringify(msg.data));
        systemData = msg.data;
        writeLog(`[DEBUG] UPDATE_DATA recebido: ${Object.keys(msg.data || {}).join(', ')}`);
    }
    if (msg.type === 'UPDATE_CONFIG') {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(msg.data));
        configData = msg.data;
        writeLog(`[DEBUG] UPDATE_CONFIG recebido: autoPilot=${msg.data.autoPilot}, apiKey=${msg.data.apiKey ? msg.data.apiKey.substring(0,10)+'...' : 'N/A'}`);
    }
});

writeLog('BOT: Inicializando cliente do WhatsApp (iniciando Puppeteer)...');

// Watchdog: se o evento 'ready' não disparar em 3 minutos, loga o problema
setTimeout(() => {
    if (!isReady) {
        writeLog('[WATCHDOG] ERRO: ready não disparou em 3 minutos. Puppeteer travado.');
        if (process.send) process.send({ type: 'LOG', data: { role: 'system', content: 'WATCHDOG: Timeout - ready não disparou. Reinicie o bot.', contact: 'SYSTEM' } });
    }
}, 3 * 60 * 1000);

client.initialize();

