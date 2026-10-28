// src/lib/badgeEvaluator.js
import { supabase } from "@/lib/supabase";

export async function evaluateAndUnlockBadges(userId) {
  if (!userId) return [];

  try {
    // 1. Obter todas as badges cadastradas
    const { data: allBadges } = await supabase.from("badges").select("*");
    if (!allBadges || allBadges.length === 0) return [];

    // 2. Obter emblemas já desbloqueados pelo aluno
    const { data: unlocked } = await supabase
      .from("user_badges")
      .select("badge_id, unlocked_at")
      .eq("user_clerk_id", userId);

    const unlockedIds = new Set(unlocked ? unlocked.map((u) => u.badge_id) : []);

    // 3. Obter participações do aluno
    const { data: playerParticipations } = await supabase
      .from("game_players")
      .select("id, session_id, score")
      .eq("clerk_id", userId);

    const gamesPlayedCount = playerParticipations?.length || 0;
    const playerIds = playerParticipations ? playerParticipations.map((p) => p.id) : [];

    let correctAnswersCount = 0;
    let fastAnswersCount = 0; // >= 10s restantes
    let superFastAnswersCount = 0; // >= 12s restantes (resposta em menos de 3s)
    let clutchAnswersCount = 0; // respostas corretas com 1s ou 2s restantes
    let maxSessionStreak = 0;
    let flawlessGamesCount = 0;

    if (playerIds.length > 0) {
      const { data: answersData } = await supabase
        .from("player_answers")
        .select("session_id, player_id, is_correct, time_left, question_index")
        .in("player_id", playerIds)
        .order("question_index", { ascending: true });

      if (answersData && answersData.length > 0) {
        // Agrupar respostas por participação para avaliar streaks e partidas perfeitas
        const answersByPlayer = {};

        answersData.forEach((a) => {
          if (!answersByPlayer[a.player_id]) {
            answersByPlayer[a.player_id] = [];
          }
          answersByPlayer[a.player_id].push(a);

          if (a.is_correct) {
            correctAnswersCount++;
            if ((a.time_left || 0) >= 12) superFastAnswersCount++;
            if ((a.time_left || 0) >= 10) fastAnswersCount++;
            if ((a.time_left || 0) === 1 || (a.time_left || 0) === 2) clutchAnswersCount++;
          }
        });

        // Avaliação por partida
        Object.values(answersByPlayer).forEach((pAnswers) => {
          let currentStreak = 0;
          let allCorrect = true;

          pAnswers.forEach((ans) => {
            if (ans.is_correct) {
              currentStreak++;
              if (currentStreak > maxSessionStreak) {
                maxSessionStreak = currentStreak;
              }
            } else {
              currentStreak = 0;
              allCorrect = false;
            }
          });

          // Partida sem nenhum erro (mínimo de 5 respostas)
          if (allCorrect && pAnswers.length >= 5) {
            flawlessGamesCount++;
          }
        });
      }
    }

    // Avaliação de vitórias, pódios e pontuações máximas
    let firstPlaceCount = 0;
    let topThreeCount = 0;
    let maxSessionScore = 0;

    if (playerParticipations && playerParticipations.length > 0) {
      for (const part of playerParticipations) {
        if ((part.score || 0) > maxSessionScore) {
          maxSessionScore = part.score;
        }

        const { data: sessionRanking } = await supabase
          .from("game_players")
          .select("id, score")
          .eq("session_id", part.session_id)
          .order("score", { ascending: false });

        if (sessionRanking && sessionRanking.length > 0) {
          const rankIndex = sessionRanking.findIndex((p) => p.id === part.id);
          if (rankIndex === 0 && sessionRanking[0].score > 0) firstPlaceCount++;
          if (rankIndex >= 0 && rankIndex < 3 && sessionRanking[rankIndex].score > 0) topThreeCount++;
        }
      }
    }

    // 4. Mapeamento das regras dos 30 emblemas
    const badgesToUnlock = [];

    // Vitórias & Pódio
    if (firstPlaceCount >= 1 && !unlockedIds.has("first_win")) badgesToUnlock.push("first_win");
    if (topThreeCount >= 1 && !unlockedIds.has("top_three")) badgesToUnlock.push("top_three");
    if (firstPlaceCount >= 3 && !unlockedIds.has("champion_3x")) badgesToUnlock.push("champion_3x");
    if (topThreeCount >= 5 && !unlockedIds.has("podium_regular")) badgesToUnlock.push("podium_regular");
    if (firstPlaceCount >= 10 && !unlockedIds.has("legend")) badgesToUnlock.push("legend");
    if (firstPlaceCount >= 20 && !unlockedIds.has("dynasty")) badgesToUnlock.push("dynasty");

    // Participação & Presença
    if (gamesPlayedCount >= 1 && !unlockedIds.has("first_game")) badgesToUnlock.push("first_game");
    if (gamesPlayedCount >= 5 && !unlockedIds.has("veteran")) badgesToUnlock.push("veteran");
    if (gamesPlayedCount >= 10 && !unlockedIds.has("dedicated")) badgesToUnlock.push("dedicated");
    if (gamesPlayedCount >= 25 && !unlockedIds.has("veteran_25")) badgesToUnlock.push("veteran_25");
    if (gamesPlayedCount >= 50 && !unlockedIds.has("marathoner")) badgesToUnlock.push("marathoner");
    if (gamesPlayedCount >= 100 && !unlockedIds.has("centenary_player")) badgesToUnlock.push("centenary_player");

    // Precisão
    if (correctAnswersCount >= 10 && !unlockedIds.has("sharp_mind")) badgesToUnlock.push("sharp_mind");
    if (correctAnswersCount >= 25 && !unlockedIds.has("scholar")) badgesToUnlock.push("scholar");
    if (correctAnswersCount >= 50 && !unlockedIds.has("mastermind")) badgesToUnlock.push("mastermind");
    if (correctAnswersCount >= 100 && !unlockedIds.has("centurion")) badgesToUnlock.push("centurion");
    if (correctAnswersCount >= 250 && !unlockedIds.has("oracle")) badgesToUnlock.push("oracle");
    if (flawlessGamesCount >= 1 && !unlockedIds.has("flawless_game")) badgesToUnlock.push("flawless_game");

    // Streaks
    if (maxSessionStreak >= 3 && !unlockedIds.has("streak_master")) badgesToUnlock.push("streak_master");
    if (maxSessionStreak >= 4 && !unlockedIds.has("zen_master")) badgesToUnlock.push("zen_master");
    if (maxSessionStreak >= 5 && !unlockedIds.has("super_streak")) badgesToUnlock.push("super_streak");
    if (maxSessionStreak >= 8 && !unlockedIds.has("unstoppable_streak")) badgesToUnlock.push("unstoppable_streak");

    // Velocidade
    if (superFastAnswersCount >= 1 && !unlockedIds.has("lightning_fast")) badgesToUnlock.push("lightning_fast");
    if (fastAnswersCount >= 5 && !unlockedIds.has("sonic_reflexes")) badgesToUnlock.push("sonic_reflexes");
    if (fastAnswersCount >= 15 && !unlockedIds.has("speed_demon")) badgesToUnlock.push("speed_demon");
    if (clutchAnswersCount >= 1 && !unlockedIds.has("clutch_answer")) badgesToUnlock.push("clutch_answer");

    // Pontuações
    if (maxSessionScore >= 3000 && !unlockedIds.has("score_3k")) badgesToUnlock.push("score_3k");
    if (maxSessionScore >= 5000 && !unlockedIds.has("score_5k")) badgesToUnlock.push("score_5k");
    if (maxSessionScore >= 10000 && !unlockedIds.has("score_10k")) badgesToUnlock.push("score_10k");
    if (maxSessionScore >= 15000 && !unlockedIds.has("score_15k")) badgesToUnlock.push("score_15k");

    // Inserir os emblemas elegíveis no Supabase
    if (badgesToUnlock.length > 0) {
      const rows = badgesToUnlock.map((badgeId) => ({
        user_clerk_id: userId,
        badge_id: badgeId,
      }));
      await supabase.from("user_badges").insert(rows);
    }

    // 5. Retornar a coleção consolidada
    const updatedUnlockedIds = new Set([...unlockedIds, ...badgesToUnlock]);

    return allBadges.map((badge) => {
      const unlockRecord = unlocked?.find((u) => u.badge_id === badge.id);
      return {
        ...badge,
        unlocked: updatedUnlockedIds.has(badge.id),
        unlocked_at: unlockRecord?.unlocked_at || (badgesToUnlock.includes(badge.id) ? new Date().toISOString() : null),
      };
    });
  } catch (err) {
    console.error("Erro ao avaliar emblemas:", err);
    return [];
  }
}