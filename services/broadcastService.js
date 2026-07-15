import { supabase } from '../lib/supabase';

/**
 * Fetches every currently-active broadcast message, newest first.
 */
export const fetchActiveBroadcasts = async () => {
  const { data, error } = await supabase
    .from('broadcast_messages')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error fetching broadcasts:', error);
    return [];
  }

  return data || [];
};