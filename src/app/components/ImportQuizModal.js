"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { QUIZ_CATEGORIES } from "@/constants/categories";

/**
 * Modal profissional para importação de questionários estruturados (JSON, CSV e TXT).
 * Suporta enunciado, opções, gabarito, tempo limite e URL de imagem ilustrativa (image_url).
 * Alimenta tanto as tabelas 'quizzes'/'questions' quanto a tabela pedagógica 'knowledge_bank'.
 */
export default function ImportQuizModal({
  isOpen,
  onClose,
  onImportComplete,
  currentUserId,
  authorName,
}) {
  const [fileType, setFileType] = useState("json"); // 'json' | 'csv' | 'txt'
  const [category, setCategory] = useState(QUIZ_CATEGORIES[0]?.id || "Concurso Público");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);

  if (!isOpen) return null;

  // 1. Gera e descarrega modelos com o campo 'image_url' / 'url_imagem'
  const handleDownloadSample = () => {
    let content = "";
    let filename = "";
    let mime = "";

    if (fileType === "json") {
      filename = "modelo_quiz_menteafiada.json";
      mime = "application/json";
      content = JSON.stringify(
        {
          title: "Legislação de Trânsito - CTB Simulado 01",
          category: category,
          description: "Questões estruturadas com suporte a imagens ilustrativas de sinalização.",
          questions: [
            {
              question: "Qual é o significado da placa de sinalização de regulamentação R-1 exibida na imagem?",
              image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Placa_R-1.svg/300px-Placa_R-1.svg.png",
              time_seconds: 20,
              options: [
                { text: "Dê a Preferência", is_correct: false },
                { text: "Parada Obrigatória", is_correct: true },
                { text: "Sentido Proibido", is_correct: false },
                { text: "Passagem Obrigatória", is_correct: false },
              ],
            },
            {
              question: "Qual a velocidade máxima permitida em vias de trânsito rápido onde não houver sinalização regulamentadora?",
              image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Brazil_road_sign_R-19_80.svg/300px-Brazil_road_sign_R-19_80.svg.png",
              time_seconds: 20,
              options: [
                { text: "60 km/h", is_correct: false },
                { text: "80 km/h", is_correct: true },
                { text: "90 km/h", is_correct: false },
                { text: "110 km/h", is_correct: false },
              ],
            },
          ],
        },
        null,
        2
      );
    } else if (fileType === "csv") {
      filename = "modelo_quiz_menteafiada.csv";
      mime = "text/csv";
      content =
        "pergunta;url_imagem;opcao_a;opcao_b;opcao_c;opcao_d;indice_correto;tempo_segundos\n" +
        "Qual é o significado da placa R-1?;https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Placa_R-1.svg/300px-Placa_R-1.svg.png;Dê a Preferência;Parada Obrigatória;Sentido Proibido;Passagem Obrigatória;1;20\n" +
        "Qual a velocidade máxima em vias de trânsito rápido sem sinalização?;https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Brazil_road_sign_R-19_80.svg/300px-Brazil_road_sign_R-19_80.svg.png;60 km/h;80 km/h;90 km/h;110 km/h;1;20\n";
    } else {
      filename = "modelo_quiz_menteafiada.txt";
      mime = "text/plain";
      content =
        "TITULO: Simulado de Trânsito Ilustrado\n" +
        "CATEGORIA: Concurso Público\n\n" +
        "1. Qual é o significado da placa de trânsito ilustrada?\n" +
        "IMAGEM: https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Placa_R-1.svg/300px-Placa_R-1.svg.png\n" +
        "A) Dê a Preferência\n" +
        "B) Parada Obrigatória\n" +
        "C) Sentido Proibido\n" +
        "D) Passagem Obrigatória\n" +
        "GABARITO: B\n" +
        "TEMPO: 20\n\n" +
        "2. O uso do cinto de segurança é obrigatório para:\n" +
        "A) Apenas o condutor\n" +
        "B) Apenas passageiros do banco dianteiro\n" +
        "C) Condutor e todos os passageiros em todas as vias\n" +
        "D) Apenas em rodovias federais\n" +
        "GABARITO: C\n" +
        "TEMPO: 15\n";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Parser JSON com suporte a URLs de imagens
  const parseJsonFile = (text) => {
    const parsed = JSON.parse(text);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("O JSON precisa conter uma lista de perguntas sob o atributo 'questions'.");
    }

    const formattedQuestions = parsed.questions.map((q, idx) => {
      let correctIdx = 0;
      let rawOptions = [];

      if (Array.isArray(q.options) && typeof q.options[0] === "object") {
        correctIdx = q.options.findIndex((opt) => opt.is_correct === true);
        rawOptions = q.options.map((opt) => opt.text || "");
      } else if (Array.isArray(q.options)) {
        rawOptions = q.options;
        correctIdx = typeof q.correct_option === "number" ? q.correct_option : 0;
      }

      return {
        question_text: q.question || q.question_text || `Questão #${idx + 1}`,
        image_url: q.image_url ? String(q.image_url).trim() : null,
        options:
          rawOptions.length >= 4
            ? rawOptions.slice(0, 4)
            : [...rawOptions, "N/A", "N/A", "N/A"].slice(0, 4),
        correct_option: correctIdx >= 0 ? correctIdx : 0,
        time_seconds: Number(q.time_seconds) || 20,
        question_order: idx + 1,
      };
    });

    return {
      title: parsed.title || "Novo Quiz Importado (JSON)",
      category: parsed.category || category,
      questions: formattedQuestions,
    };
  };

  // 3. Parser CSV com suporte a url_imagem
  const parseCsvFile = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("O arquivo CSV não possui linhas suficientes.");
    }

    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headerCols = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
    const hasImageCol = headerCols.some((col) => col.includes("img") || col.includes("imagem"));

    const dataRows = lines.slice(1);
    const formattedQuestions = [];

    dataRows.forEach((row, idx) => {
      const cols = row.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));

      if (hasImageCol && cols.length >= 7) {
        // Layout: pergunta; url_imagem; opt_a; opt_b; opt_c; opt_d; gabarito; tempo
        const questionText = cols[0];
        const imageUrl = cols[1] && cols[1].startsWith("http") ? cols[1] : null;
        const options = [cols[2], cols[3], cols[4], cols[5]];
        const correctIdx = Number(cols[6]) >= 0 && Number(cols[6]) <= 3 ? Number(cols[6]) : 0;
        const timeLimit = cols[7] ? Number(cols[7]) : 20;

        formattedQuestions.push({
          question_text: questionText,
          image_url: imageUrl,
          options,
          correct_option: correctIdx,
          time_seconds: timeLimit,
          question_order: idx + 1,
        });
      } else if (!hasImageCol && cols.length >= 5) {
        // Layout sem imagem
        const questionText = cols[0];
        const options = [cols[1], cols[2], cols[3], cols[4]];
        const correctIdx = Number(cols[5]) >= 0 && Number(cols[5]) <= 3 ? Number(cols[5]) : 0;
        const timeLimit = cols[6] ? Number(cols[6]) : 20;

        formattedQuestions.push({
          question_text: questionText,
          image_url: null,
          options,
          correct_option: correctIdx,
          time_seconds: timeLimit,
          question_order: idx + 1,
        });
      }
    });

    if (formattedQuestions.length === 0) {
      throw new Error("Não foi possível identificar registros válidos no layout CSV.");
    }

    return {
      title: "Quiz Importado (CSV)",
      category: category,
      questions: formattedQuestions,
    };
  };

  // 4. Parser TXT estruturado
  const parseTxtFile = (text) => {
    const lines = text.split(/\r?\n/);
    let title = "Quiz Importado (TXT)";
    let questionsList = [];

    let currentQ = null;
    let optionsMap = {};

    const finalizeCurrentQuestion = () => {
      if (currentQ && currentQ.question_text) {
        const letters = ["A", "B", "C", "D"];
        const opts = letters.map((l) => optionsMap[l] || "Opção vazia");
        const correctIdx = letters.indexOf((currentQ.gabarito || "A").toUpperCase());

        questionsList.push({
          question_text: currentQ.question_text,
          image_url: currentQ.image_url || null,
          options: opts,
          correct_option: correctIdx >= 0 ? correctIdx : 0,
          time_seconds: currentQ.time_seconds || 20,
          question_order: questionsList.length + 1,
        });
      }
      currentQ = null;
      optionsMap = {};
    };

    lines.forEach((line) => {
      const clean = line.trim();
      if (!clean) return;

      if (clean.toUpperCase().startsWith("TITULO:")) {
        title = clean.substring(7).trim();
        return;
      }

      if (clean.toUpperCase().startsWith("CATEGORIA:")) {
        return;
      }

      const questionMatch = clean.match(/^(\d+)[\.\)]\s*(.+)/);
      if (questionMatch) {
        finalizeCurrentQuestion();
        currentQ = {
          question_text: questionMatch[2].trim(),
          image_url: null,
          gabarito: "A",
          time_seconds: 20,
        };
        return;
      }

      if (clean.toUpperCase().startsWith("IMAGEM:") && currentQ) {
        const urlCandidate = clean.substring(7).trim();
        if (urlCandidate.startsWith("http")) {
          currentQ.image_url = urlCandidate;
        }
        return;
      }

      const optionMatch = clean.match(/^([A-Da-d])[\)\.\-]\s*(.+)/);
      if (optionMatch && currentQ) {
        optionsMap[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
        return;
      }

      if (clean.toUpperCase().startsWith("GABARITO:") && currentQ) {
        currentQ.gabarito = clean.substring(9).trim();
        return;
      }

      if (clean.toUpperCase().startsWith("TEMPO:") && currentQ) {
        const parsedTime = parseInt(clean.substring(6).trim(), 10);
        if (!isNaN(parsedTime)) currentQ.time_seconds = parsedTime;
        return;
      }
    });

    finalizeCurrentQuestion();

    if (questionsList.length === 0) {
      throw new Error("Nenhuma questão formatada foi localizada no texto informado.");
    }

    return {
      title,
      category,
      questions: questionsList,
    };
  };

  // 5. Leitor de arquivo do cliente
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage("");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result;
        let parsedResult = null;

        if (file.name.endsWith(".json") || fileType === "json") {
          parsedResult = parseJsonFile(fileContent);
        } else if (file.name.endsWith(".csv") || fileType === "csv") {
          parsedResult = parseCsvFile(fileContent);
        } else {
          parsedResult = parseTxtFile(fileContent);
        }

        setPreviewData(parsedResult);
        setStatusMessage(`✅ ${parsedResult.questions.length} questões identificadas com sucesso!`);
      } catch (err) {
        setPreviewData(null);
        setStatusMessage(`❌ Falha no processamento: ${err.message}`);
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  // 6. Gravação com tratamento defensivo no Supabase
  const handleSaveToDatabase = async () => {
    if (!previewData || previewData.questions.length === 0) return;

    setIsProcessing(true);
    setStatusMessage("A gravar questionário no Supabase...");

    try {
      // 1. Criar o Quiz na tabela 'quizzes'
      const quizPayload = {
        title: previewData.title,
        category: previewData.category || category,
        created_by: currentUserId,
        author_name: authorName,
        is_public: false,
        is_official: false,
        is_arena_eligible: true,
      };

      let { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert(quizPayload)
        .select()
        .single();

      // Fallback caso a coluna author_name não exista no schema local
      if (quizError && quizError.message?.includes("author_name")) {
        console.warn("[ImportQuizModal] author_name ausente no schema. Usando fallback.");
        const fallback = { ...quizPayload };
        delete fallback.author_name;
        const res = await supabase.from("quizzes").insert(fallback).select().single();
        newQuiz = res.data;
        quizError = res.error;
      }

      if (quizError || !newQuiz) {
        throw new Error("Erro ao criar o quiz: " + (quizError?.message || "Erro desconhecido"));
      }

      // 2. Inserir as questões na tabela 'questions' (com image_url)
      const questionsPayload = previewData.questions.map((q, idx) => ({
        quiz_id: newQuiz.id,
        question_text: q.question_text,
        image_url: q.image_url || null,
        options: q.options,
        correct_option: q.correct_option,
        time_seconds: q.time_seconds || 20,
        question_order: idx + 1,
      }));

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from("questions")
        .insert(questionsPayload)
        .select();

      if (questionsError) {
        throw new Error("Erro ao registrar perguntas: " + questionsError.message);
      }

      // 3. Alimentar a tabela pedagógica 'knowledge_bank' em try/catch isolado (sem encadear .catch())
      try {
        const knowledgeRows = previewData.questions.map((q) => {
          const correctText = q.options[q.correct_option] || "";
          const distractors = q.options.filter((_, i) => i !== q.correct_option);

          return {
            quiz_id: newQuiz.id,
            category: previewData.category || category,
            topic: previewData.title,
            statement: q.question_text,
            correct_answer: correctText,
            distractors: distractors,
            source_file: `upload_${fileType.toUpperCase()}`,
            created_by: currentUserId,
          };
        });

        // Execução segura: se a tabela knowledge_bank ainda não existir, o erro é registrado no log sem bloquear a criação
        const { error: kbError } = await supabase.from("knowledge_bank").insert(knowledgeRows);
        if (kbError) {
          console.warn("[ImportQuizModal] Aviso ao alimentar knowledge_bank (opcional):", kbError.message);
        }
      } catch (kbException) {
        console.warn("[ImportQuizModal] Tabela knowledge_bank indisponível no momento:", kbException);
      }

      // Conclui o fluxo e atualiza a interface pai
      onImportComplete(newQuiz, insertedQuestions);
      onClose();
    } catch (saveErr) {
      console.error("[ImportQuizModal] Erro de persistência:", saveErr);
      setStatusMessage(`❌ Erro ao salvar: ${saveErr.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 shadow-2xl space-y-5 text-[var(--foreground)] max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-lg">📥</span>
            <div>
              <h3 className="text-lg font-bold">Importação Estruturada de Questões</h3>
              <p className="text-xs text-[var(--foreground)] opacity-70">
                Alimente simultaneamente os questionários de aula e a base de conhecimento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="opacity-50 hover:opacity-100 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Seletores de Formato e Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="block mb-1 opacity-80">Formato do Arquivo:</label>
            <div className="grid grid-cols-3 gap-1 bg-[var(--background)] p-1 rounded-xl border border-[var(--card-border)]">
              {["json", "csv", "txt"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFileType(type);
                    setPreviewData(null);
                    setStatusMessage("");
                  }}
                  className={`py-1.5 rounded-lg uppercase font-bold text-center cursor-pointer transition ${
                    fileType === type
                      ? "bg-purple-600 text-white shadow"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1 opacity-80">Categoria Principal:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl p-2.5 font-bold focus:outline-none cursor-pointer"
            >
              {QUIZ_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zona de Download do Modelo de Exemplo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs">
          <span className="text-purple-300 font-medium">
            Baixe o modelo com suporte a imagem ilustrativa (URL):
          </span>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            ⬇️ Baixar Modelo {fileType.toUpperCase()}
          </button>
        </div>

        {/* Drag & Drop Input */}
        <div className="border-2 border-dashed border-[var(--card-border)] hover:border-purple-500 rounded-2xl p-6 text-center space-y-2 bg-[var(--background)] cursor-pointer relative transition">
          <input
            type="file"
            accept={fileType === "json" ? ".json" : fileType === "csv" ? ".csv" : ".txt"}
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <span className="text-3xl block">🖼️</span>
          <p className="text-xs font-bold text-[var(--foreground)]">
            Clique aqui ou arraste o ficheiro <strong>.{fileType}</strong>
          </p>
          <p className="text-[10px] opacity-60">Codificação UTF-8 suportada.</p>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              statusMessage.startsWith("✅")
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : statusMessage.startsWith("❌")
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                : "bg-purple-500/10 text-purple-300"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {/* Pré-visualização com Miniatura de Imagem */}
        {previewData && (
          <div className="flex-1 overflow-y-auto space-y-2 max-h-48 border border-[var(--card-border)] p-3 rounded-2xl bg-[var(--background)]">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--card-border)] text-xs font-bold">
              <span>Quiz: {previewData.title}</span>
              <span className="text-purple-400">{previewData.questions.length} questões</span>
            </div>
            {previewData.questions.map((q, i) => (
              <div
                key={i}
                className="text-xs p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-2"
              >
                <div className="flex items-start gap-3">
                  {q.image_url ? (
                    <img
                      src={q.image_url}
                      alt="Ilustração"
                      className="w-12 h-12 rounded-lg object-cover border border-[var(--card-border)] flex-shrink-0 bg-slate-900"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[var(--background)] border border-[var(--card-border)] flex items-center justify-center text-slate-500 flex-shrink-0 text-[10px] font-bold">
                      Sem img
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">
                      #{i + 1}. {q.question_text}
                    </p>
                    {q.image_url && (
                      <span className="text-[10px] text-purple-400 font-mono truncate block max-w-xs">
                        🖼️ {q.image_url}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] opacity-80 pt-1 border-t border-[var(--card-border)]/50">
                  {q.options.map((opt, oIdx) => (
                    <span
                      key={oIdx}
                      className={oIdx === q.correct_option ? "text-emerald-400 font-bold" : ""}
                    >
                      {String.fromCharCode(65 + oIdx)}) {opt} {oIdx === q.correct_option ? "✓" : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="flex gap-3 pt-2 border-t border-[var(--card-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl border border-[var(--card-border)] text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isProcessing || !previewData}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
          >
            {isProcessing ? "A Gravar..." : "Confirmar e Integrar ao Acervo"}
          </button>
        </div>
      </div>
    </div>
  );
}