/**
 * REPLICAÇÃO DA LÓGICA DE IA PARA NODE.JS (BACKEND)
 * Adaptado de aiService.ts para JS puro e sem dependência de React
 * REMOVIDO require('node-fetch') pois Node 18+ possui fetch nativo.
 */

async function processQueryWithAI(query, contextData, apiKey, history = []) {

    if (!apiKey) {
        return { text: "Erro: Chave API não configurada no Bot." };
    }

    const { owners, rentals, currentMonth, currentYear, fullDate, dayOfWeek, time } = contextData;

    // Simplificado para contexto do bot
    const waMonitor = '';
    const waHistory = history.map(h => `${h.role === 'assistant' ? 'Jobh IA' : 'Cliente'}: ${h.content}`).join('\n');

    const systemPrompt = `Você é a Jobh IA, o assistente inteligente da Jobh Imóveis. 
Sua missão é ajudar na gestão de inquilinos e atuar no atendimento via WhatsApp.

REGRAS CRÍTICAS DE RESPOSTA:
1. FOCO NO AGORA: Ignorar saudações antigas. Hoje é ${dayOfWeek}, ${fullDate} às ${time}.
2. OBRIGATÓRIO RETORNAR APENAS JSON VÁLIDO no seguinte formato:
{
  "text": "Sua mensagem amigável e profissional para enviar ao cliente no WhatsApp.",
  "actions": [
    {
      "name": "CREATE_OCCURRENCE | UPDATE_RENTAL",
      "params": { ... }
    }
  ]
}

3. QUANDO CRIAR CHAMADO (CREATE_OCCURRENCE):
   - Se o cliente/inquilino relatar qualquer vazamento, problema elétrico, fechadura quebrada, infiltração, conserto ou solicitação de manutenção, adicione no array "actions":
     {
       "name": "CREATE_OCCURRENCE",
       "params": {
         "description": "Resumo claro do problema relatado",
         "urgency": "low | medium | high"
       }
     }

4. QUANDO ATUALIZAR DADOS (UPDATE_RENTAL):
   - Params: { "rentalId": "ID_DO_INQUILINO", "field": "rentAmount | dueDay | isPaid | tenantName", "value": novo_valor }

Dados Atuais: ${dayOfWeek}, ${fullDate} (${time})
---
DADOS DO SISTEMA:
PROPRIETÁRIOS: ${JSON.stringify(owners.map(o => ({ id: o.id, nome: o.name, cpf: o.cpf })))}
INQUILINOS (Use para consultas financeiras): ${JSON.stringify(rentals.map(r => ({
        id: r.id,
        nome: r.tenantName,
        ref: r.refNumber,
        vencimento: r.dueDay,
        pago: r.isPaid,
        valor: r.rentAmount,
        contrato: r.contractDate
    })))}
---
Histórico:
${waHistory}`;


    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content })),
        { role: 'user', content: query }
    ];

    if (apiKey.startsWith('gsk_')) {
        return await callGroq(messages, apiKey);
    }

    return await callGemini(messages, apiKey);
}

async function callGroq(messages, apiKey) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    // Mapeia mensagens para o formato OpenAI/Groq
    const finalMessages = messages.map(m => {
        let role = m.role;
        if (m.role === 'model') role = 'assistant';
        return { role: role, content: m.content };
    });

    const body = {
        model: 'llama-3.3-70b-versatile',
        messages: finalMessages,
        temperature: 0.1,
        max_tokens: 1000
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erro Groq ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;

        if (!rawContent) throw new Error("Sem resposta da IA");

        // Limpeza JSON
        const cleanContent = rawContent.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
        try {
            const firstBrace = cleanContent.indexOf('{');
            const lastBrace = cleanContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                return JSON.parse(cleanContent.substring(firstBrace, lastBrace + 1));
            }
            return JSON.parse(cleanContent);
        } catch (e) {
            return { text: rawContent };
        }

    } catch (error) {
        console.error("Erro Groq:", error);
        return { text: "Erro técnico ao processar Groq." };
    }
}

async function callGemini(messages, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Adaptação de formato para Gemini
    const body = {
        contents: messages.map(m => ({
            role: m.role === 'system' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'), // Gemini não suporta 'system' role diretamente api v1beta
            parts: [{ text: m.content }]
        })),
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
        }
    };

    // Tratamento para System Prompt no Gemini (Workaround: Colocar como primeira mensagem USER)
    // Se a primeira msg for system, o Gemini pode rejeitar. Melhor estratégia: fundir no contexto ou usar systemInstruction se suportado (v1beta suporta systemInstruction)
    // Vamos usar systemInstruction no body para ficar limpo
    const systemInstruction = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const finalBody = {
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        contents: chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        })),
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Erro Gemini ${response.status}`);
        }

        const data = await response.json();
        let rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawContent) throw new Error("Sem resposta da IA");

        // Limpeza JSON
        const cleanContent = rawContent.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
        try {
            const firstBrace = cleanContent.indexOf('{');
            const lastBrace = cleanContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                return JSON.parse(cleanContent.substring(firstBrace, lastBrace + 1));
            }
            return JSON.parse(cleanContent);
        } catch (e) {
            return { text: rawContent };
        }

    } catch (error) {
        console.error("Erro AI:", error);
        return { text: "Erro técnico ao processar IA." };
    }
}

module.exports = { processQueryWithAI };
