"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function ArenaChat({ sessionId, playerName, userClerkId }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Rolar para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Buscar mensagens existentes e subscrever ao Realtime
  useEffect(() => {
    if (!sessionId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("arena_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data);
    };

    fetchMessages();

    // Escutar novas mensagens instantaneamente
    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "arena_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
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

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  // Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const cleanText = inputMessage.trim();
    if (!cleanText || !sessionId) return;

    setInputMessage("");

    await supabase.from("arena_messages").insert({
      session_id: sessionId,
      sender_name: playerName || "Jogador",
      sender_clerk_id: userClerkId || null,
      message: cleanText,
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-[999] font-sans">
      {/* Botão Flutuante de Abrir/Fechar Chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-2xl transition cursor-pointer flex items-center justify-center border border-purple-400/40"
        >
          <span className="text-xl">💬</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-slate-900">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Caixa do Chat Aberta */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-96 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-150">
          {/* Header do Chat */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black tracking-wider uppercase">
                Chat da Arena ⚔️
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-sm font-bold px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Histórico de Mensagens */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 text-xs">
            {messages.length === 0 ? (
              <p className="text-center text-[var(--foreground)] opacity-40 py-12">
                Nenhuma mensagem enviada. Seja o primeiro a falar! 👋
              </p>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_name === playerName;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] font-bold opacity-60 mb-0.5 px-1">
                      {isMe ? "Você" : m.sender_name}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                        isMe
                          ? "bg-purple-600 text-white rounded-br-xs"
                          : "bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-bl-xs"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Envio */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              maxLength={140}
              className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none placeholder-slate-500"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}