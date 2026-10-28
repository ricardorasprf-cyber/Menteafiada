"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AfiadinhoAvatar() {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const messagesEndRef = useRef(null);

  // Inicializa o estado lendo do sessionStorage
  const [messages, setMessages] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("afiadinho_chat_history");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Mensagem inicial de boas-vindas se o histórico estiver vazio
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            t("afiadinho_welcome") ||
            "Olá! Sou o Afiadinho, o seu guia no MenteAfiada. Como posso ajudar?",
        },
      ]);
    }
  }, [language]);

  // Guarda histórico atualizado no sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem("afiadinho_chat_history", JSON.stringify(messages));
      } catch (e) {}
    }
  }, [messages]);

  // Auto-scroll para a mensagem mais recente
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Oculta o balão de chamada externo após 8s
  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async (textToSend) => {
    const messageContent = (typeof textToSend === "string" ? textToSend : input).trim();
    if (!messageContent || loading) return;

    setInput("");
    setShowBubble(false);

    const userMessage = { role: "user", content: messageContent };
    const updatedMessages = [...messages, userMessage];

    // Adiciona a mensagem do usuário e um slot vazio para o assistente ir preenchendo
    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          language: language,
        }),
      });

      // Tratamento direto de resposta sem throw new Error
      if (!res.ok) {
        const errorText = await res.text();
        setMessages((prev) => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = {
            role: "assistant",
            content:
              errorText ||
              "O serviço de IA está temporariamente ocupado. Por favor, tente novamente em instantes.",
          };
          return newArr;
        });
        setLoading(false);
        return;
      }

      // Leitura da resposta por streaming
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedResponse += chunk;

        setMessages((prev) => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = {
            role: "assistant",
            content: streamedResponse,
          };
          return newArr;
        });
      }
    } catch (err) {
      console.error("Erro na comunicação com o chat:", err);
      setMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = {
          role: "assistant",
          content: "Tive um imprevisto na ligação. Por favor, tente enviar novamente.",
        };
        return newArr;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    const initialMsg = [
      {
        role: "assistant",
        content:
          t("afiadinho_welcome") ||
          "Olá! Sou o Afiadinho, o seu guia no MenteAfiada. Como posso ajudar?",
      },
    ];
    setMessages(initialMsg);
    sessionStorage.removeItem("afiadinho_chat_history");
  };

  const quickOptions = [
    { text: t("quick_how_to_play") || "Como jogar um Quiz?", icon: "🎮" },
    { text: t("quick_how_to_create") || "Como criar uma sala?", icon: "🏫" },
    { text: t("quick_my_courses") || "Onde vejo meus cursos?", icon: "📚" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Balão de chamada externo */}
      {!isOpen && showBubble && (
        <div
          onClick={() => {
            setIsOpen(true);
            setShowBubble(false);
          }}
          className="mb-3 mr-1 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--card-border)] py-2 px-4 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 cursor-pointer animate-bounce select-none transition hover:opacity-90"
        >
          <span>{t("need_help") || "👋 Precisa de ajuda? Fale comigo!"}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowBubble(false);
            }}
            className="opacity-50 hover:opacity-100 text-[10px] ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Janela de Conversa */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Topo / Header */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500 overflow-hidden bg-slate-800 flex items-center justify-center relative shadow">
                <Image
                  src="/afiadinho.png"
                  alt="Afiadinho Avatar"
                  fill
                  sizes="40px"
                  className="object-cover rounded-full"
                />
              </div>
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  {t("afiadinho_title") || "Afiadinho"}{" "}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  {t("afiadinho_role") || "Assistente Virtual MenteAfiada"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                title={t("clear_chat") || "Limpar conversa"}
                className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 rounded transition cursor-pointer"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Histórico das Mensagens */}
          <div className="p-4 h-80 overflow-y-auto space-y-3 text-xs bg-[var(--background)]/50">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-500/50 flex-shrink-0 mt-0.5 bg-slate-900 relative">
                      <Image
                        src="/afiadinho.png"
                        alt="Avatar"
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl font-medium shadow-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--card-border)] rounded-tl-none"
                    }`}
                  >
                    {m.content}
                    {loading && idx === messages.length - 1 && !isUser && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-purple-500 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Botões de Atalho Rápido na Vertical */}
          <div className="p-3 bg-[var(--card-bg)] border-t border-[var(--card-border)]/60 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--foreground)] opacity-60 mb-0.5">
              Sugestões rápidas:
            </span>
            {quickOptions.map((opt, i) => (
              <button
                key={i}
                disabled={loading}
                onClick={() => handleSendMessage(opt.text)}
                className="w-full text-left flex items-center justify-between text-xs font-medium bg-[var(--background)] hover:bg-purple-500/10 border border-[var(--card-border)] hover:border-purple-500 text-[var(--foreground)] px-3 py-2 rounded-xl transition duration-150 shadow-sm disabled:opacity-50 cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span>{opt.text}</span>
                </span>
                <span className="text-[10px] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  →
                </span>
              </button>
            ))}
          </div>

          {/* Campo de Entrada de Texto */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[var(--card-bg)] border-t border-[var(--card-border)] flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat_placeholder") || "Digite sua dúvida..."}
              className="flex-1 bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shadow-md shadow-purple-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Botão Flutuante do Avatar */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowBubble(false);
        }}
        className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 p-1 shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
        aria-label="Abrir assistente Afiadinho"
      >
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 opacity-40 blur-md group-hover:opacity-80 transition duration-500 animate-pulse"></div>

        <div className="relative w-full h-full rounded-full bg-slate-900 border-2 border-white/80 overflow-hidden flex items-center justify-center">
          <Image
            src="/afiadinho.png"
            alt={t("talk_to_afiadinho") || "Fale com o Afiadinho"}
            fill
            priority
            sizes="64px"
            className="object-cover group-hover:rotate-3 transition-transform duration-300"
          />
        </div>

        <span className="absolute -top-1 -left-1.5 bg-emerald-500 border-2 border-white dark:border-slate-900 text-[8px] font-black tracking-wider text-white px-1 py-0.5 rounded-full scale-90 shadow">
          BETA
        </span>
        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></span>
      </button>
    </div>
  );
}