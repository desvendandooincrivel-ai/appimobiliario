
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

// Global function to call AI (supports Google Gemini, OpenRouter and Local Ollama)
const callAI = async (messages: any[], apiKey: string) => {
    const isLocal = apiKey.toLowerCase() === 'local';
    const isGemini = apiKey.startsWith('AIza');

    let url = isLocal ? 'http://localhost:11434/api/chat' : 'https://openrouter.ai/api/v1/chat/completions';
    if (isGemini) {
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    }

    try {
        const body = isGemini ? {
            contents: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            })),
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096
            }
        } : {
            model: isLocal ? 'gemma3:1b' : 'google/gemini-2.0-flash-exp:free',
            messages: messages,
            stream: false,
            temperature: 0.1,
            ...(isLocal ? {} : { max_tokens: 1000 })
        };

        const response = await fetch(url, {
            method: 'POST',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                ...(isLocal || isGemini ? {} : {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Jobh Imóveis Manager'
                })
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        let rawContent = '';

        if (isGemini) {
            rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
            rawContent = isLocal ? data.message?.content : data.choices?.[0]?.message?.content;
        }

        if (!rawContent) throw new Error('A IA não retornou mensagem.');

        try {
            // Remove markdown code fences if present
            const cleanContent = rawContent.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
            const firstBrace = cleanContent.indexOf('{');
            const lastBrace = cleanContent.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                return JSON.parse(cleanContent.substring(firstBrace, lastBrace + 1));
            }
            return JSON.parse(cleanContent);
        } catch (parseError) {
            console.log("JSON Parse Failed, raw:", rawContent); // Log for debug
            // If parse fails, we try to salvage the text part if possible or just return as text
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
    const waHistory = context.waLog && context.waLog.length > 0 ? `\n[WHATSAPP RECENT HISTORY]\n${context.waLog.map(l => {
        const sender = l.role === 'assistant' ? 'Jobh IA' : (l.contact || 'Cliente');
        return `${l.time} - ${sender}: ${l.content || l.text}`;
    }).join('\n')}\n` : '';

    const isAutopilot = query.includes("MENSAGEM RECEBIDA");

    const now = new Date();
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const fullDate = now.toLocaleDateString('pt-BR');
    const dayOfWeek = weekDays[now.getDay()];
    const time = now.toLocaleTimeString('pt-BR');

    const systemPrompt = `Você é a Jobh IA, o assistente inteligente da Jobh Imóveis. 
Sua missão é ajudar na gestão de inquilinos e WhatsApp.

REGRAS CRÍTICAS:
1. FOCO NO AGORA: Hoje é ${dayOfWeek}, ${fullDate} às ${time}.
2. CRIAR CHAMADO: Se o usuário relatar problemas de manutenção, use "CREATE_OCCURRENCE".
3. Ações Disponíveis: 
   - SET_VIEW (Params: view - 'dashboard', 'rentals', 'owners', 'whatsapp', 'occurrences', 'documents')
   - UPDATE_RENTAL (Params: rentalId, field, value)
   - CREATE_OCCURRENCE (Params: description, urgency)
4. DADOS FINANCEIROS: Use a tabela abaixo para responder sobre valores e vencimentos.

Dados Atuais: ${dayOfWeek}, ${fullDate} (${time})
---
DADOS DO SISTEMA:
PROPRIETÁRIOS: ${JSON.stringify(context.owners.map(o => ({ id: o.id, nome: o.name, cpf: o.cpf })))}
INQUILINOS: ${JSON.stringify(context.rentals.map(r => ({
        id: r.id,
        nome: r.tenantName,
        ref: r.refNumber,
        vencimento: r.dueDay,
        pago: r.isPaid,
        valor: r.rentAmount,
        contrato: r.contractDate
    })))}
---
Monitor WhatsApp (Ativo): ${waMonitor}
Histórico Recente WhatsApp: ${waHistory}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-5).map(m => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: query }
    ];

    try {
        return await callAI(messages, apiKey);
    } catch (e: any) {
        console.error("AI Error:", e);
        return { text: `Erro técnico: ${e.message}. Verifique se sua chave API está correta.` };
    }
};

const processLocalMock = (query: string, context: any): AIResponse => {
    return { text: "Por favor, configure sua chave do OpenRouter para ativar a IA." };
};
