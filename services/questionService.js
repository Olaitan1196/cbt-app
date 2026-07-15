// services/questionService.js
//
// Only job: ask Supabase for questions and hand back a plain list.
// Does NOT touch the phone's local storage — that's localCache.js's job.

import { supabase } from '../lib/supabase';

export const fetchQuestionsFromSupabase = async (examBody, subject, topic = null) => {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('exam_body', examBody)
    .eq('subject', subject);

  if (topic) {
    query = query.eq('topic', topic);
  }

  const { data, error } = await query;

  if (error) {
    console.log('Error fetching questions from Supabase:', error);
    throw error;
  }

  return data;
};