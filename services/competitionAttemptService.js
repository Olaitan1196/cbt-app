// services/competitionAttemptService.js
//
// Handles everything related to ONE competition attempt: starting it,
// saving each answer as it happens, and — now — deciding promotion,
// survival, or demotion the moment an attempt finishes.
//
// TIER DIRECTION: Tier 20 is the lowest/entry tier. Tier 1 is the highest.
// Promotion moves a student's tier number DOWN (20 -> 19 -> ... -> 1).
// Demotion moves it UP (19 -> 20). At Tier 1, there is no higher tier —
// reaching promotion_points there still adds to cumulative points
// (rewarding continued excellence) but the student simply stays at Tier 1.

import { supabase } from '../lib/supabase';

export const getTierInfo = async (seasonId, tierNumber) => {
  const { data, error } = await supabase
    .from('competition_tiers')
    .select('*')
    .eq('season_id', seasonId)
    .eq('tier_number', tierNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getOrCreateTierProgress = async (participantId, tierNumber) => {
  const { data: existing, error: fetchError } = await supabase
    .from('competition_tier_progress')
    .select('*')
    .eq('participant_id', participantId)
    .eq('tier_number', tierNumber)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('competition_tier_progress')
    .insert({ participant_id: participantId, tier_number: tierNumber })
    .select()
    .single();

  if (createError) throw createError;
  return created;
};

export const startAttempt = async (participantId, tierNumber) => {
  const { data, error } = await supabase
    .from('competition_attempts')
    .insert({ participant_id: participantId, tier_number: tierNumber })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const saveAnswer = async ({
  attemptId,
  questionId,
  subject,
  isCorrect,
  isMissed,
  pointsEarned,
  timeTakenMs,
}) => {
  const { error } = await supabase.from('competition_answers').insert({
    attempt_id: attemptId,
    question_id: questionId,
    subject,
    is_correct: isCorrect,
    is_missed: isMissed,
    points_earned: pointsEarned,
    time_taken_ms: timeTakenMs,
  });

  if (error) throw error;
};

// Called once, when the student finishes all 180 questions.
// Marks the attempt complete, updates lifetime tier stats, and
// runs the promotion / survival / demotion decision.
export const completeAttempt = async ({
  attemptId,
  participantId,
  tierNumber,
  totalPoints,
  correctCount,
  missedCount,
  wrongCount,
  totalTimeMs,
}) => {
  const { error: attemptError } = await supabase
    .from('competition_attempts')
    .update({
      completed_at: new Date().toISOString(),
      total_points: totalPoints,
      correct_count: correctCount,
      missed_count: missedCount,
      wrong_count: wrongCount,
      promoted: false, // set true below if this attempt earns promotion
    })
    .eq('id', attemptId);

  if (attemptError) throw attemptError;

  const tierInfo = await getTierInfo(
    (await getParticipantSeasonId(participantId)),
    tierNumber
  );
  const progress = await getOrCreateTierProgress(participantId, tierNumber);

  // Always add this attempt's lifetime stats, regardless of outcome.
  const updatedLifetime = {
    total_attempts_lifetime: progress.total_attempts_lifetime + 1,
    total_correct_lifetime: progress.total_correct_lifetime + correctCount,
    total_missed_lifetime: progress.total_missed_lifetime + missedCount,
    total_wrong_lifetime: progress.total_wrong_lifetime + wrongCount,
    total_time_ms_lifetime: progress.total_time_ms_lifetime + totalTimeMs,
    latest_score: totalPoints,
  };

  const reachedPromotion = totalPoints >= tierInfo.promotion_points;

  if (reachedPromotion) {
    // PROMOTION — record the score that earned it, reset attempts.
    await supabase
      .from('competition_tier_progress')
      .update({
        ...updatedLifetime,
        attempts_remaining: 3,
        promoted_with_score: totalPoints,
      })
      .eq('id', progress.id);

    await supabase.from('competition_attempts').update({ promoted: true }).eq('id', attemptId);

    const nextTier = tierNumber > 1 ? tierNumber - 1 : 1; // Tier 1 has no higher tier

    await supabase
      .from('competition_participants')
      .update({
        current_tier: nextTier,
        last_tier_change_at: new Date().toISOString(),
      })
      .eq('id', participantId);

    // Make sure a progress row exists for the new tier if they actually moved.
    if (nextTier !== tierNumber) {
      await getOrCreateTierProgress(participantId, nextTier);
    }

    return { outcome: 'promoted', newTier: nextTier };
  }

  // Not enough to promote this attempt — decrement attempts remaining.
  const attemptsRemaining = Math.max(progress.attempts_remaining - 1, 0);

  if (attemptsRemaining > 0) {
    // Still has attempts left — just save stats, no tier change yet.
    await supabase
      .from('competition_tier_progress')
      .update({ ...updatedLifetime, attempts_remaining: attemptsRemaining })
      .eq('id', progress.id);

    return { outcome: 'attempt_recorded', attemptsRemaining };
  }

  // Attempts exhausted — check survival.
  const survived = totalPoints >= tierInfo.survival_points;

  if (survived) {
    // SURVIVAL — stay at this tier, fresh 3 attempts.
    await supabase
      .from('competition_tier_progress')
      .update({ ...updatedLifetime, attempts_remaining: 3 })
      .eq('id', progress.id);

    return { outcome: 'survived' };
  }

  // DEMOTION — drop to the tier below (higher tier_number), fresh 3 attempts there.
  await supabase
    .from('competition_tier_progress')
    .update({ ...updatedLifetime, attempts_remaining: 0 })
    .eq('id', progress.id);

  const demotedTier = tierNumber < 20 ? tierNumber + 1 : 20; // Tier 20 is the lowest

  await getOrCreateTierProgress(participantId, demotedTier);

  await supabase
    .from('competition_participants')
    .update({
      current_tier: demotedTier,
      demotions_count: (await getDemotionsCount(participantId)) + 1,
      last_tier_change_at: new Date().toISOString(),
    })
    .eq('id', participantId);

  // Reset the new (lower) tier's attempts to a fresh 3.
  await supabase
    .from('competition_tier_progress')
    .update({ attempts_remaining: 3 })
    .eq('participant_id', participantId)
    .eq('tier_number', demotedTier);

  return { outcome: 'demoted', newTier: demotedTier };
};

// Small helpers used above
const getParticipantSeasonId = async (participantId) => {
  const { data, error } = await supabase
    .from('competition_participants')
    .select('season_id')
    .eq('id', participantId)
    .single();
  if (error) throw error;
  return data.season_id;
};

const getDemotionsCount = async (participantId) => {
  const { data, error } = await supabase
    .from('competition_participants')
    .select('demotions_count')
    .eq('id', participantId)
    .single();
  if (error) throw error;
  return data.demotions_count;
};