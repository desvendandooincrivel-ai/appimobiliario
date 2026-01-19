
import { Owner, Rental } from '../types';

/**
 * Jobh AI Agent Service
 * Handles advanced NLP and autonomous tool execution via OpenRouter.
 */

export interface AIAction {
    name: 'SET_VIEW' | 'UPSERT_RENTAL' | 'UPSERT_OWNER' | 'DELETE_RENTAL' | 'DELETE_OWNER' | 'OPEN_MODAL' | 'SEND_WHATSAPP';
    params: any;
}

export interface AIResponse {
    text: string;
    actions?: AIAction[];
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Global function to call AI (supports OpenRouter and Local Ollama)
const callAI = async (messages: any[], apiKey: string) => {
    const isLocal = apiKey.toLowerCase() === 'local';
    const url = isLocal ? 'http://localhost:11434/api/chat' : 'https://openrouter.ai/api/v1/chat/completions';

    try {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                ...(isLocal ? {} : {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Jobh Imóveis Manager'
                })
            },
            body: JSON.stringify({
                model: isLocal ? 'gemma3:1b' : 'google/gemini-2.0-flash-exp:free',
                messages: messages,
                stream: false,
                temperature: 0.1,
                ...(isLocal ? {} : { max_tokens: 1000 })
            })
        });

        if (!response.ok) throw new Error('Falha na conexão com a IA.');

        const data = await response.json();
        const rawContent = isLocal ? data.message?.content : data.choices[0]?.message?.content;

        if (!rawContent) throw new Error('A IA não retornou mensagem.');

        try {
            const firstBrace = rawContent.indexOf('{');
            const lastBrace = rawContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                return JSON.parse(rawContent.substring(firstBrace, lastBrace + 1));
            }
            return JSON.parse(rawContent);
        } catch (parseError) {
            return { text: rawContent, actions: [] };
        }
    } catch (e: any) {
        throw e;
    }
};

export const processQueryWithAI = async (
    query: string,
    context: { owners: Owner[], rentals: Rental[], currentMonth: string, currentYear: number, waContext?: any, waLog?: any[] },
    apiKey?: string,
    history: ChatMessage[] = []
): Promise<AIResponse> => {

    if (!apiKey) {
        return processLocalMock(query, context);
    }

    const waMonitor = context.waContext ? `\n[WHATSAPP MONITOR - ACTIVE CHAT]\nContact: ${context.waContext.contact}\nLast Messages:\n${context.waContext.lastMessages.join('\n')}\n` : '';
    const waHistory = context.waLog && context.waLog.length > 0 ? `\n[WHATSAPP RECENT HISTORY]\n${context.waLog.map(l => `${l.time} - ${l.contact}: ${l.text}`).join('\n')}\n` : '';

    const isAutopilot = query.includes("MENSAGEM RECEBIDA");

    const systemPrompt = `Você é a Jobh IA, o assistente inteligente da Jobh Imóveis. 
Sua missão é ajudar na gestão de inquilinos e WhatsApp.

REGRAS:
1. Idioma: Sempre Português (Brasil).
2. Formato: SEMPRE JSON válido: {"text": "Suas palavras aqui", "actions": []}.
3. Ações: SET_VIEW (dashboard, whatsapp, rentals, owners, occurrences, documents) e SEND_WHATSAPP.
4. DOCUMENTOS: Se o usuário pedir para buscar arquivos ou contratos, use SET_VIEW para "documents".
4. EXECUÇÃO DIRETA: Se o usuário pedir uma informação (ex: lista de números), você DEVE dar a informação IMEDIATAMENTE na primeira resposta. 
5. PROIBIÇÃO: Jamais responda "vou verificar" ou "aguarde". Pesquise nos dados abaixo e entregue o resultado NA HORA.

Monitor WhatsApp (Ativo): ${waMonitor}
Histórico Recente WhatsApp: ${waHistory}
Data Atual: ${context.currentMonth}/${context.currentYear}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-5).map(m => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: query }
    ];

    try {
        const isLocal = apiKey.toLowerCase() === 'local';
        const url = isLocal ? 'http://localhost:11434/api/chat' : 'https://openrouter.ai/api/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(isLocal ? {} : {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Jobh Imóveis Manager'
                })
            },
            body: JSON.stringify({
                model: isLocal ? 'deepseek-r1:1.5b' : 'meta-llama/llama-3.1-8b-instruct:free',
                messages: messages,
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        const rawContent = isLocal ? data.message?.content : data.choices[0]?.message?.content;

        if (!rawContent) throw new Error('A IA respondeu em branco.');

        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            return JSON.parse(rawContent.substring(firstBrace, lastBrace + 1));
        }
        return { text: rawContent, actions: [] };
    } catch (e: any) {
        console.error("AI Error:", e);
        return { text: `Erro técnico: ${e.message}. Verifique se sua chave API está correta.` };
    }
};

const processLocalMock = (query: string, context: any): AIResponse => {
    return { text: "Por favor, configure sua chave do OpenRouter para ativar a IA." };
};
