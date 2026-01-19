import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Minimize2, Maximize2, Sparkles, Terminal, Trash2 } from 'lucide-react';
import { Owner, Rental } from '../types';
import { processQueryWithAI } from '../utils/aiService';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isSystem?: boolean;
}

interface AIAssistantProps {
    owners: Owner[];
    rentals: Rental[];
    currentMonth: string;
    currentYear: number;
    onExecuteAction: (action: string, params: any) => void;
    waContext?: any;
    waLog?: any[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ owners, rentals, currentMonth, currentYear, onExecuteAction, waContext, waLog }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('jobh_gemini_api_key') || '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');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Olá! Sou o Jobh IA. Agora estou monitorando as conversas do WhatsApp em tempo real. Como posso ajudar?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const clearChat = () => {
        setMessages([
            { role: 'assistant', content: 'Conversa limpa! Como posso te ajudar agora?' }
        ]);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const saveApiKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem('jobh_gemini_api_key', key);
        setShowConfig(false);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsTyping(true);

        try {
            const contextHistory = messages.slice(-6);

            const aiResponse = await processQueryWithAI(
                userMessage,
                { owners, rentals, currentMonth, currentYear, waContext, waLog },
                apiKey,
                contextHistory
            );

            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', content: aiResponse.text }]);
                setIsTyping(false);

                if (aiResponse.actions && aiResponse.actions.length > 0) {
                    aiResponse.actions.forEach(action => {
                        onExecuteAction(action.name, action.params);
                    });
                }
            }, 600);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema ao processar sua solicitação. Verifique sua conexão e chave API." }]);
            setIsTyping(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 group overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-500 group-hover:opacity-90 transition-opacity" />
                <Sparkles className="relative z-10 animate-pulse" size={28} />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 bg-white shadow-2xl rounded-2xl border border-indigo-100 flex flex-col transition-all z-50 overflow-hidden ${isMinimized ? 'w-72 h-14' : 'w-96 h-[550px]'}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-purple-800 p-3 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                        <Sparkles size={16} className="text-yellow-300" />
                    </div>
                    <span className="font-bold text-sm tracking-tight">Jobh IA</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={clearChat} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Limpar conversa">
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => setShowConfig(!showConfig)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Configurar API">
                        <Terminal size={14} />
                    </button>
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {showConfig && (
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-slide-down">
                            <label className="text-[10px] font-bold text-indigo-700 uppercase mb-1 block">Chave API do Gemini</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole sua chave aqui..."
                                    className="flex-1 text-xs p-2 rounded-lg border border-indigo-200 outline-none focus:ring-2 ring-indigo-500/20"
                                />
                                <button
                                    onClick={() => saveApiKey(apiKey)}
                                    className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-lg font-bold hover:bg-indigo-700"
                                >
                                    Salvar
                                </button>
                            </div>
                            <p className="text-[9px] text-indigo-400 mt-2 italic">Aumente a autonomia com o Gemini 2.0 Flash.</p>
                        </div>
                    )}

                    {/* Messages Body */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-indigo-50 text-gray-800 rounded-tl-none'
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 mb-1.5 border-b border-indigo-50 pb-1">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Jobh IA</span>
                                        </div>
                                    )}
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-indigo-50 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t bg-white/80 backdrop-blur-sm">
                        <div className="relative flex items-center bg-gray-100/80 rounded-2xl p-1 focus-within:ring-2 ring-indigo-500/20 transition-all">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={apiKey ? "Comande a IA agora..." : "Configure a API Key para começar..."}
                                className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm text-gray-700 outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
