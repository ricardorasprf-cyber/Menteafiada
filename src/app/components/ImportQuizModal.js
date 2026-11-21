/**
 * ============================================================================
 * Plataforma Educacional MenteAfiada
 * Arquivo: src/app/components/ImportQuizModal.js
 * Objetivo: Importação em lote de questionários pedagógicos (.JSON, .CSV, .TXT)
 * com modelos completos abrangendo todas as 4 modalidades da plataforma:
 * 1. Múltipla Escolha (multiple_choice);
 * 2. Completar Lacunas ("___") com palavras sugeridas (fill_blanks);
 * 3. Ordenação Sequencial / Procedimental (sequence_order);
 * 4. Verdadeiro ou Falso Relâmpago (true_false).
 * Inclui também gerador de Prompt Pronto para IA externa e download de modelos
 * em .JSON, .CSV e .TXT.
 * ============================================================================
 */

"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { QUIZ_CATEGORIES } from "@/constants/categories";

// 1. Modelo JSON completo com todas as 4 modalidades de questão
const SAMPLE_JSON_TEMPLATE = {
  title: "Simulado Completo (4 Modalidades) - MenteAfiada",
  category: "Concurso Público",
  questions: [
    {
      type: "multiple_choice",
      question_text:
        "Qual é a distância lateral mínima exigida pelo CTB ao ultrapassar um ciclista?",
      options: ["0,50 metro", "1,00 metro", "1,50 metro", "2,00 metros"],
      correct_option: 2,
      time_seconds: 20,
      image_url: null,
    },
    {
      type: "fill_blanks",
      question_text:
        "O condutor deve manter ___ de segurança e respeitar o ___ de velocidade da via.",
      correctSequence: ["distância", "limite"],
      distractors: ["ultrapassagem", "farol", "acostamento"],
      time_seconds: 25,
      image_url: null,
    },
    {
      type: "sequence_order",
      question_text:
        "Coloque na ordem lógica correta os passos de sinalização de um sinistro na rodovia:",
      correctOrder: [
        "Ligar o pisca-alerta do veículo",
        "Posicionar o triângulo de segurança na distância regulamentar",
        "Acionar o serviço de emergência (191)",
        "Aguardar em local seguro fora da pista",
      ],
      time_seconds: 30,
      image_url: null,
    },
    {
      type: "true_false",
      question_text:
        "É permitido transitar pelo acostamento para ultrapassar veículos em congestionamento.",
      answer: "Falso",
      time_seconds: 15,
      image_url: null,
    },
  ],
};

// 2. Modelo CSV completo com todas as 4 modalidades (separador ';')
const SAMPLE_CSV_TEMPLATE = `Tipo;Enunciado;Coluna_A_ou_Sequencia;Coluna_B_ou_Distratores;Coluna_C;Coluna_D;Gabarito;Tempo;Imagem_URL
multipla_escolha;Qual é a distância lateral mínima ao ultrapassar um ciclista?;0,50 metro;1,00 metro;1,50 metro;2,00 metros;C;20;
completar_lacunas;O condutor deve manter ___ de segurança e respeitar o ___ da via.;distância, limite;ultrapassagem, farol, acostamento;;;0;25;
ordenacao;Ordene os passos corretos ao sinalizar uma ocorrência na rodovia:;Ligar pisca-alerta;Posicionar triângulo;Acionar emergência 191;Aguardar fora da pista;0;30;
verdadeiro_falso;É permitido transitar pelo acostamento para ultrapassar congestionamentos.;Falso;;;;1;15;`;

// 3. Modelo TXT completo com todas as 4 modalidades (separador '|')
const SAMPLE_TXT_TEMPLATE = `Tipo | Enunciado | OpcaoA_ou_Sequencia | OpcaoB_ou_Distratores | OpcaoC | OpcaoD | Gabarito | Tempo | Imagem_URL
multipla_escolha | Qual é a distância lateral mínima ao ultrapassar um ciclista? | 0,50 metro | 1,00 metro | 1,50 metro | 2,00 metros | C | 20 | 
completar_lacunas | O condutor deve manter ___ de segurança e respeitar o ___ da via. | distância, limite | ultrapassagem, farol, acostamento |  |  | 0 | 25 | 
ordenacao | Ordene os passos corretos ao sinalizar uma ocorrência na rodovia: | Ligar pisca-alerta | Posicionar triângulo | Acionar emergência 191 | Aguardar fora da pista | 0 | 30 | 
verdadeiro_falso | É permitido transitar pelo acostamento para ultrapassar congestionamentos. | Falso |  |  |  | 1 | 15 | `;

// Prompt otimizado para o professor colar em qualquer IA (Gemini, ChatGPT, Claude)
const AI_PROMPT_HELPER = `Crie um questionário em formato JSON válido (sem markdown) sobre o tema "[INSIRA O TEMA AQUI]" contendo 8 questões variadas entre os 4 tipos aceitos pela plataforma MenteAfiada:
1) "multiple_choice": 4 opções em "options" (array de strings) e "correct_option" (índice 0 a 3).
2) "fill_blanks": enunciado contendo lacunas marcadas com "___", "correctSequence" (array das palavras corretas na ordem) e "distractors" (array de 2 a 3 palavras extras).
3) "sequence_order": enunciado pedindo ordenação e "correctOrder" (array de 3 a 4 etapas na ordem exata).
4) "true_false": afirmação objetiva e "answer" ("Verdadeiro" ou "Falso").

Siga exatamente esta estrutura JSON:
${JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2)}`;

export default function ImportQuizModal({
  isOpen,
  onClose,
  onImportComplete,
  currentUserId,
  authorName,
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(
    QUIZ_CATEGORIES[0]?.id || "Concurso Público"
  );
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  // Normaliza o identificador do tipo de questão vindo do CSV/TXT/JSON
  const normalizeQuestionType = (rawType, questionText) => {
    const t = String(rawType || "").trim().toLowerCase();
    if (
      t.includes("lacuna") ||
      t.includes("completar") ||
      t === "fill_blanks" ||
      String(questionText).includes("___")
    ) {
      return "fill_blanks";
    }
    if (
      t.includes("orden") ||
      t.includes("sequenc") ||
      t === "sequence_order"
    ) {
      return "sequence_order";
    }
    if (
      t.includes("verdadeiro") ||
      t.includes("falso") ||
      t === "vf" ||
      t === "true_false"
    ) {
      return "true_false";
    }
    return "multiple_choice";
  };

  // Analisa e converte JSON, CSV (';') ou TXT ('|')
  const handleParseContent = (content) => {
    setRawText(content);
    setParseError("");

    const trimmed = content.trim();
    if (!trimmed) {
      setParsedQuestions([]);
      return;
    }

    try {
      // 1. Parse como JSON Estruturado
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const jsonObj = JSON.parse(trimmed);
        if (jsonObj.title && !title) setTitle(jsonObj.title);
        if (jsonObj.category) setCategory(jsonObj.category);

        const list = Array.isArray(jsonObj)
          ? jsonObj
          : jsonObj.questions || [];

        const normalized = list.map((item) => {
          const qText = item.question_text || item.question || "";
          const qType = normalizeQuestionType(item.type, qText);
          const timeSec = Number(item.time_seconds) || 20;
          const img = item.image_url ? String(item.image_url).trim() : null;

          if (qType === "fill_blanks") {
            const seq = Array.isArray(item.correctSequence)
              ? item.correctSequence
              : String(item.correctSequence || item.answer || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);

            const distractors = Array.isArray(item.distractors)
              ? item.distractors
              : String(item.distractors || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);

            const bank = Array.isArray(item.bank)
              ? item.bank
              : [...seq, ...distractors];

            return {
              question_text: qText,
              image_url: img,
              time_seconds: timeSec,
              format: "fill_blanks",
              options: {
                type: "fill_blanks",
                correctSequence: seq,
                bank,
              },
              correct_option: 0,
              previewAnswer: seq.join(" → "),
            };
          }

          if (qType === "sequence_order") {
            const order = Array.isArray(item.correctOrder)
              ? item.correctOrder
              : Array.isArray(item.options)
              ? item.options
              : String(item.correctOrder || "")
                  .split("|")
                  .map((s) => s.trim())
                  .filter(Boolean);

            return {
              question_text: qText,
              image_url: img,
              time_seconds: timeSec,
              format: "sequence_order",
              options: {
                type: "sequence_order",
                correctOrder: order,
              },
              correct_option: 0,
              previewAnswer: order.join(" → "),
            };
          }

          if (qType === "true_false") {
            const rawAns = String(
              item.correctIndex ?? item.correct_option ?? item.answer ?? "0"
            )
              .trim()
              .toLowerCase();
            const isFalse =
              rawAns === "1" ||
              rawAns === "f" ||
              rawAns === "falso" ||
              rawAns === "false";
            const correctIdx = isFalse ? 1 : 0;

            return {
              question_text: qText,
              image_url: img,
              time_seconds: timeSec,
              format: "true_false",
              options: {
                type: "true_false",
                choices: ["Verdadeiro", "Falso"],
                correctIndex: correctIdx,
              },
              correct_option: correctIdx,
              previewAnswer: correctIdx === 0 ? "Verdadeiro" : "Falso",
            };
          }

          // Padrão: Múltipla Escolha
          const opts = Array.isArray(item.options)
            ? item.options
            : [item.optionA, item.optionB, item.optionC, item.optionD].filter(
                Boolean
              );
          const corr = Number(item.correct_option ?? 0);

          return {
            question_text: qText,
            image_url: img,
            time_seconds: timeSec,
            format: "multiple_choice",
            options: opts,
            correct_option: corr,
            previewAnswer: opts[corr] || "Opção A",
          };
        });

        setParsedQuestions(normalized.filter((q) => q.question_text));
        return;
      }

      // 2. Parse como CSV (';') ou TXT ('|')
      const lines = trimmed
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const results = [];

      lines.forEach((line, lineIdx) => {
        const delimiter = line.includes(";") ? ";" : "|";
        const cols = line.split(delimiter).map((c) => c.trim());

        // Ignora linha de cabeçalho
        if (
          lineIdx === 0 &&
          (cols[0].toLowerCase() === "tipo" ||
            cols[0].toLowerCase() === "enunciado" ||
            cols[0].toLowerCase() === "pergunta")
        ) {
          return;
        }

        const firstColLower = cols[0].toLowerCase();
        const hasTypeCol = [
          "multipla_escolha",
          "completar_lacunas",
          "fill_blanks",
          "ordenacao",
          "sequence_order",
          "verdadeiro_falso",
          "true_false",
          "vf",
        ].includes(firstColLower);

        const rawType = hasTypeCol ? cols[0] : "multipla_escolha";
        const qText = hasTypeCol ? cols[1] : cols[0];
        if (!qText) return;

        const qType = normalizeQuestionType(rawType, qText);

        if (qType === "fill_blanks") {
          const seq = String(hasTypeCol ? cols[2] : cols[1] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const distractors = String(hasTypeCol ? cols[3] : cols[2] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const timeSec =
            Number(hasTypeCol ? cols[7] || cols[4] : cols[3]) || 25;
          const img = (hasTypeCol ? cols[8] || cols[5] : cols[4]) || null;

          results.push({
            question_text: qText,
            image_url: img,
            time_seconds: timeSec,
            format: "fill_blanks",
            options: {
              type: "fill_blanks",
              correctSequence: seq,
              bank: [...seq, ...distractors],
            },
            correct_option: 0,
            previewAnswer: seq.join(" → "),
          });
        } else if (qType === "sequence_order") {
          const steps = [
            hasTypeCol ? cols[2] : cols[1],
            hasTypeCol ? cols[3] : cols[2],
            hasTypeCol ? cols[4] : cols[3],
            hasTypeCol ? cols[5] : cols[4],
          ].filter(Boolean);
          const timeSec =
            Number(hasTypeCol ? cols[7] || cols[6] : cols[5]) || 30;
          const img = (hasTypeCol ? cols[8] || cols[7] : cols[6]) || null;

          results.push({
            question_text: qText,
            image_url: img,
            time_seconds: timeSec,
            format: "sequence_order",
            options: {
              type: "sequence_order",
              correctOrder: steps,
            },
            correct_option: 0,
            previewAnswer: steps.join(" → "),
          });
        } else if (qType === "true_false") {
          const ansRaw = String(hasTypeCol ? cols[2] : cols[1] || "V")
            .trim()
            .toLowerCase();
          const isFalse =
            ansRaw === "1" ||
            ansRaw === "f" ||
            ansRaw === "falso" ||
            ansRaw === "false";
          const corrIdx = isFalse ? 1 : 0;
          const timeSec =
            Number(hasTypeCol ? cols[7] || cols[3] : cols[2]) || 15;
          const img = (hasTypeCol ? cols[8] || cols[4] : cols[3]) || null;

          results.push({
            question_text: qText,
            image_url: img,
            time_seconds: timeSec,
            format: "true_false",
            options: {
              type: "true_false",
              choices: ["Verdadeiro", "Falso"],
              correctIndex: corrIdx,
            },
            correct_option: corrIdx,
            previewAnswer: corrIdx === 0 ? "Verdadeiro" : "Falso",
          });
        } else {
          // Múltipla Escolha tradicional
          const offset = hasTypeCol ? 1 : 0;
          const opts = [
            cols[0 + offset] || "",
            cols[1 + offset] || "",
            cols[2 + offset] || "",
            cols[3 + offset] || "",
          ];
          const rawCorr = String(cols[4 + offset] || "0")
            .trim()
            .toUpperCase();
          const letterMap = { A: 0, B: 1, C: 2, D: 3 };
          const corrIdx =
            rawCorr in letterMap ? letterMap[rawCorr] : Number(rawCorr) || 0;
          const timeSec = Number(cols[5 + offset]) || 20;
          const img = cols[6 + offset] || null;

          results.push({
            question_text: qText,
            image_url: img,
            time_seconds: timeSec,
            format: "multiple_choice",
            options: opts,
            correct_option: corrIdx,
            previewAnswer: opts[corrIdx] || "Opção A",
          });
        }
      });

      setParsedQuestions(results);
    } catch (err) {
      setParseError("Erro ao interpretar o arquivo: " + err.message);
      setParsedQuestions([]);
    }
  };

  // Leitura de arquivo local (.json, .csv, .txt)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      handleParseContent(String(evt.target?.result || ""));
    };
    reader.readAsText(file, "UTF-8");
  };

  // Pré-visualiza modelos completos com os 4 formatos no editor
  const handleLoadJsonTemplate = () => {
    if (!title) setTitle(SAMPLE_JSON_TEMPLATE.title);
    handleParseContent(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2));
  };

  const handleLoadCsvTemplate = () => {
    if (!title) setTitle("Simulado CSV Completo (4 Modalidades)");
    handleParseContent(SAMPLE_CSV_TEMPLATE);
  };

  const handleLoadTxtTemplate = () => {
    if (!title) setTitle("Simulado TXT Completo (4 Modalidades)");
    handleParseContent(SAMPLE_TXT_TEMPLATE);
  };

  // Faz download direto do arquivo modelo (.json, .csv ou .txt) para o computador do professor
  const handleDownloadSampleFile = (format) => {
    let content = "";
    let mime = "text/plain;charset=utf-8";
    let filename = "modelo_menteafiada_4_formatos.txt";

    if (format === "json") {
      content = JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2);
      mime = "application/json;charset=utf-8";
      filename = "modelo_menteafiada_4_formatos.json";
    } else if (format === "csv") {
      content = SAMPLE_CSV_TEMPLATE;
      mime = "text/csv;charset=utf-8";
      filename = "modelo_menteafiada_4_formatos.csv";
    } else {
      content = SAMPLE_TXT_TEMPLATE;
      mime = "text/plain;charset=utf-8";
      filename = "modelo_menteafiada_4_formatos.txt";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copia o prompt estruturado para o professor colar no ChatGPT / Gemini / Claude
  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_HELPER);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleConfirmImport = async () => {
    if (!title.trim()) {
      alert("Informe um título para o questionário.");
      return;
    }
    if (parsedQuestions.length === 0) {
      alert("Nenhuma questão válida identificada para importar.");
      return;
    }

    setImporting(true);

    try {
      let { data: newQuiz, error: quizErr } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          category,
          created_by: currentUserId,
          author_name: authorName,
          is_public: false,
          is_official: false,
          is_arena_eligible: true,
        })
        .select()
        .single();

      if (quizErr && quizErr.message?.includes("author_name")) {
        const fallback = await supabase
          .from("quizzes")
          .insert({
            title: title.trim(),
            category,
            created_by: currentUserId,
            is_public: false,
            is_official: false,
          })
          .select()
          .single();
        newQuiz = fallback.data;
        quizErr = fallback.error;
      }

      if (quizErr || !newQuiz) {
        alert("Erro ao criar quiz: " + (quizErr?.message || ""));
        setImporting(false);
        return;
      }

      const payloadQuestions = parsedQuestions.map((q, idx) => ({
        quiz_id: newQuiz.id,
        question_text: q.question_text,
        image_url: q.image_url || null,
        options: q.options,
        correct_option: q.correct_option,
        time_seconds: q.time_seconds,
        question_order: idx + 1,
      }));

      const { error: qErr } = await supabase
        .from("questions")
        .insert(payloadQuestions);

      if (qErr) {
        alert("Erro ao gravar questões: " + qErr.message);
        setImporting(false);
        return;
      }

      setRawText("");
      setParsedQuestions([]);
      setTitle("");
      if (onImportComplete) {
        await onImportComplete(newQuiz);
      }
      onClose();
    } catch (err) {
      alert("Falha inesperada na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const getFormatBadge = (format) => {
    switch (format) {
      case "fill_blanks":
        return "🧩 Completar Lacunas";
      case "sequence_order":
        return "🔀 Ordenação";
      case "true_false":
        return "⚡ V ou F";
      default:
        return "🔘 Múltipla Escolha";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 opacity-60 hover:opacity-100 font-bold cursor-pointer"
        >
          ✕
        </button>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
            IMPORTAÇÃO ESTRUTURADA EM LOTE
          </span>
          <h2 className="text-2xl font-extrabold mt-0.5">
            📥 Importar Simulado (4 Modalidades)
          </h2>
          <p className="text-xs opacity-70 mt-1">
            Suporte completo a <strong>Múltipla Escolha</strong>,{" "}
            <strong>Completar Lacunas (___)</strong>,{" "}
            <strong>Ordenação Sequencial</strong> e{" "}
            <strong>Verdadeiro/Falso</strong> via JSON, CSV, TXT ou IA externa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold opacity-80 block mb-1">
              Título do Questionário
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Simulado Completo de Legislação"
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold opacity-80 block mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {QUIZ_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de Modelos Completos (JSON, CSV, TXT) & Prompt para IA Externa */}
        <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--card-border)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow">
              📂 Carregar Arquivo (.JSON, .CSV, .TXT)
              <input
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleCopyAiPrompt}
              className="px-3.5 py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5"
              title="Copia um prompt pronto com exemplos das 4 modalidades para você colar no ChatGPT, Gemini ou Claude"
            >
              <span>🤖</span>
              <span>
                {copiedPrompt
                  ? "✓ Prompt Copiado!"
                  : "Copiar Prompt Modelo para IA"}
              </span>
            </button>
          </div>

          {/* Linha de Pré-visualização e Download dos 3 Formatos de Arquivo */}
          <div className="pt-2.5 border-t border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            {/* Modelo JSON */}
            <div className="flex items-center justify-between gap-1 p-2 rounded-xl border border-[var(--card-border)]">
              <button
                type="button"
                onClick={handleLoadJsonTemplate}
                className="text-amber-500 hover:underline font-extrabold cursor-pointer truncate"
              >
                ✨ Ver Modelo JSON
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSampleFile("json")}
                className="px-2 py-1 rounded bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 font-bold cursor-pointer flex-shrink-0"
                title="Baixar arquivo modelo .JSON com as 4 modalidades"
              >
                ⬇️ .JSON
              </button>
            </div>

            {/* Modelo CSV */}
            <div className="flex items-center justify-between gap-1 p-2 rounded-xl border border-[var(--card-border)]">
              <button
                type="button"
                onClick={handleLoadCsvTemplate}
                className="text-emerald-500 hover:underline font-extrabold cursor-pointer truncate"
              >
                📊 Ver Modelo CSV
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSampleFile("csv")}
                className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 font-bold cursor-pointer flex-shrink-0"
                title="Baixar arquivo modelo .CSV com as 4 modalidades"
              >
                ⬇️ .CSV
              </button>
            </div>

            {/* Modelo TXT */}
            <div className="flex items-center justify-between gap-1 p-2 rounded-xl border border-[var(--card-border)]">
              <button
                type="button"
                onClick={handleLoadTxtTemplate}
                className="text-cyan-500 hover:underline font-extrabold cursor-pointer truncate"
              >
                📝 Ver Modelo TXT
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSampleFile("txt")}
                className="px-2 py-1 rounded bg-cyan-500/15 text-cyan-500 hover:bg-cyan-500/25 font-bold cursor-pointer flex-shrink-0"
                title="Baixar arquivo modelo .TXT com as 4 modalidades"
              >
                ⬇️ .TXT
              </button>
            </div>
          </div>
        </div>

        {/* Área de Texto / Editor Direto */}
        <div>
          <label className="text-xs font-bold opacity-80 block mb-1">
            Conteúdo Estruturado (Cole o conteúdo da IA ou edite o modelo):
          </label>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => handleParseContent(e.target.value)}
            placeholder='Clique em "Ver Modelo JSON", "Ver Modelo CSV" ou "Ver Modelo TXT" acima para testar ou baixar os exemplos...'
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {parseError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
            {parseError}
          </div>
        )}

        {/* Pré-visualização das Questões Interpretadas */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-emerald-500 block">
              ✅ {parsedQuestions.length} questão(ões) identificada(s) e pronta(s)
              para importar:
            </span>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {parsedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-xs flex items-center justify-between gap-3"
                >
                  <div className="truncate">
                    <span className="font-bold text-indigo-400 mr-2">
                      #{idx + 1} [{getFormatBadge(q.format)}]
                    </span>
                    <span className="font-semibold">{q.question_text}</span>
                    <p className="text-[11px] text-emerald-500 mt-0.5 truncate">
                      Gabarito: {q.previewAnswer}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] opacity-60 flex-shrink-0">
                    {q.time_seconds}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--card-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--card-border)] text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={importing || parsedQuestions.length === 0}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {importing
              ? "Importando..."
              : `🚀 Importar ${parsedQuestions.length} Questões`}
          </button>
        </div>
      </div>
    </div>
  );
}