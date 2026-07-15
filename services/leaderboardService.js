// services/leaderboardService.js
//
// Fetches the ranked leaderboard for a specific tier, applying the
// full tie-break chain: cumulative points, then fewer attempts,
// then faster total time, then fewer missed, more correct, fewer
// wrong, then whoever reached this standing first.

import { supabase } from '../lib/supabase';

export const getLeaderboardForTier = async (seasonId, tierNumber) => {
  const { data, error } = await supabase
    .from('competition_leaderboard')
    .select('*')
    .eq('season_id', seasonId)
    .eq('tier_number', tierNumber)
    .order('cumulative_points', { ascending: false })
    .order('total_attempts', { ascending: true })
    .order('total_time_ms', { ascending: true })
    .order('total_missed', { ascending: true })
    .order('total_correct', { ascending: false })
    .order('total_wrong', { ascending: true })
    .order('last_tier_change_at', { ascending: true });

  if (error) throw error;
  return data;
};