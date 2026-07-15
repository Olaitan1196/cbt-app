// services/competitionService.js
//
// Handles all Genius Competition database calls: checking the active
// season, checking if a student is already registered, and registering
// a new participant.

import { supabase } from '../lib/supabase';

// Gets the currently active competition season, if one exists.
export const getActiveSeason = async () => {
  const { data, error } = await supabase
    .from('competition_seasons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data; // null if no active season right now
};

// Gets the tier marked as the entry point for a given season.
export const getEntryTier = async (seasonId) => {
  const { data, error } = await supabase
    .from('competition_tiers')
    .select('*')
    .eq('season_id', seasonId)
    .eq('is_entry_tier', true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Checks whether this student already registered for this season.
export const getParticipant = async (seasonId, userId) => {
  const { data, error } = await supabase
    .from('competition_participants')
    .select('*')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data; // null if not registered yet
};

// Registers a student for the competition and creates their
// starting tier progress row.
export const registerParticipant = async ({
  seasonId,
  userId,
  jambRegNumber,
  courseOfStudy,
  subject2,
  subject3,
  subject4,
  entryTierNumber,
}) => {
  const { data: participant, error: participantError } = await supabase
    .from('competition_participants')
    .insert({
      season_id: seasonId,
      user_id: userId,
      jamb_reg_number: jambRegNumber,
      course_of_study: courseOfStudy,
      subject_2: subject2,
      subject_3: subject3,
      subject_4: subject4,
      current_tier: entryTierNumber,
    })
    .select()
    .single();

  if (participantError) throw participantError;

  const { error: progressError } = await supabase
    .from('competition_tier_progress')
    .insert({
      participant_id: participant.id,
      tier_number: entryTierNumber,
    });

  if (progressError) throw progressError;

  return participant;
};