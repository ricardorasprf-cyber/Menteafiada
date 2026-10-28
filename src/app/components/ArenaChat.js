"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Lista base de termos ofensivos a ofuscar (expansível conforme a moderação pedagógica)
const PROFANITY_LIST = [
  "merda", "puta", "porra", "caralho", "foda", "foder", "caralhos", 
  "viado", "buceta", "pau", "otario", "otaria", "imbecil", "idiota",
  "desgracado", "desgracada", "filho da puta", "fdp", "corno", "arrombado"
];

// Regex para bloquear links ou propagação de URLs suspeitas no chat
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9_-]+\.(com|org|net|edu|gov|io|gg|me|xyz|app))/gi;

export default function ArenaChat({ sessionId, playerName, userClerkId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSentTime, setLastSentTime] = useState(0);
  const [floodWarning, setFloodWarning] = useState("");

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Rolagem automática para a mensagem mais recente
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Subscrição em tempo real ao canal de mensagens da sessão
  useEffect(() => {
    if (!sessionId) return;

    const channelId = `arena-chat-${sessionId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "broadcast",
        { event: "chat_message" },
        (payload) => {
          const incoming = payload.payload;
          setMessages((prev) => [...prev, incoming]);

          if (!isOpen) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isOpen]);

  // Sanitizador de texto contra XSS e espaços em branco abusivos
  const sanitizeInput = (text) => {
    return text
      .trim()
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .slice(0, 160); // Limita a 160 caracteres por mensagem
  };

  // Filtro de Moderação de Conteúdo (Linguagem imprópria e links)
  const moderateContent = (text) => {
    let cleanText = text;

    // 1. Bloqueia ou mascara hiperligações
    cleanText = cleanText.replace(URL_REGEX, "[link removido]");

    // 2. Ofusca termos da lista de calão com asteriscos
    PROFANITY_LIST.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      cleanText = cleanText.replace(regex, "*".repeat(word.length));
    });

    return cleanText;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setFloodWarning("");

    const now = Date.now();
    // Trava de Rate Limiting: 1,5 segundos entre envios para evitar flood
    if (now - lastSentTime < 1500) {
      setFloodWarning("Aguarde um momento antes de enviar outra mensagem.");
      return;
    }

    const cleanRaw = sanitizeInput(newMessage);
    if (!cleanRaw) return;

    // Aplica o filtro de palavras impróprias
    const filteredText = moderateContent(cleanRaw);

    const messagePayload = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sender: playerName || "Participante",
      text: filteredText,
      timestamp: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      isSelf: false,
    };

    // Atualiza estado local imediatamente (marcando como própria)
    setMessages((prev) => [...prev, { ...messagePayload, isSelf: true }]);
    setNewMessage("");
    setLastSentTime(now);

    // Dispara via Supabase Broadcast para todos os participantes na sala
    await supabase.channel(`arena-chat-${sessionId}`).send({
      type: "broadcast",
      event: "chat_message",
      payload: messagePayload,
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Botão Flutuante de Abertura do Chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl shadow-xl shadow-purple-900/30 font-bold text-xs transition-all hover:scale-105 cursor-pointer"
        >
          <span>💬</span>
          <span>Chat da Sala</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-slate-900 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Caixa de Mensagens Expansível */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl flex flex-col h-[460px] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Topo do Chat */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <div>
                <h4 className="font-bold text-xs">Chat da Partida</h4>
                <p className="text-[10px] text-slate-400">Moderação ativa & ambiente seguro</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Área de Visualização de Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--background)]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-1">
                <span className="text-2xl">🤝</span>
                <p className="text-xs">Nenhuma mensagem ainda.</p>
                <p className="text-[10px]">Deseje boa sorte aos outros jogadores!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] opacity-60 mb-0.5 px-1">
                    {msg.isSelf ? "Você" : msg.sender} • {msg.timestamp}
                  </span>
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs font-medium break-words shadow-sm ${
                      msg.isSelf
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Alerta de Flood / Spam */}
          {floodWarning && (
            <div className="px-4 py-1.5 bg-rose-500/10 border-t border-rose-500/20 text-rose-500 text-[11px] font-bold text-center">
              ⚠️ {floodWarning}
            </div>
          )}

          {/* Formulário de Envio */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-[var(--card-bg)] border-t border-[var(--card-border)] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              maxLength={160}
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              ➤
            </button>
          </form>

        </div>
      )}
    </div>
  );
}