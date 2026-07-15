import * as SQLite from 'expo-sqlite';
import { fetchQuestionsFromSupabase } from '../services/questionService';

let db = null;

export const getDb = async () => {
  if (db) return db;
  db = SQLite.openDatabaseSync('cbt_questions.db');
  return db;
};

export const initDatabase = async () => {
  const database = await getDb();

  database.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_level TEXT,
      device_id TEXT UNIQUE,
      trial_start_date TEXT,
      is_paid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      abbreviation TEXT,
      category TEXT NOT NULL,
      state TEXT,
      has_post_utme INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER,
      exam_body TEXT NOT NULL,
      institution_id INTEGER,
      year INTEGER NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      option_e TEXT,
      correct_option TEXT NOT NULL,
      explanation TEXT,
      instruction TEXT,
      passage TEXT,
      passage_group INTEGER,
      FOREIGN KEY (institution_id) REFERENCES institutions(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      exam_body TEXT,
      subject TEXT,
      date_taken TEXT,
      total_questions INTEGER,
      correct_answers INTEGER,
      score_percentage REAL,
      FOREIGN KEY (student_id) REFERENCES student(id)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      question_id INTEGER,
      student_answer TEXT,
      is_correct INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS notebook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      question_id INTEGER,
      date_added TEXT,
      FOREIGN KEY (student_id) REFERENCES student(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS license (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE,
      payment_reference TEXT,
      payment_date TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS seen_broadcasts (
      broadcast_id TEXT PRIMARY KEY,
      seen_at TEXT
    );
  `);

  console.log('Local database ready');
};

/**
 * Checks whether we already have questions saved locally
 * for this exam + subject.
 */
const hasCachedQuestions = async (examBody, subject) => {
  const database = await getDb();
  const result = await database.getFirstSync(
    'SELECT COUNT(*) as count FROM questions WHERE exam_body = ? AND subject = ?',
    [examBody, subject]
  );
  return result.count > 0;
};

/**
 * Downloads questions from Supabase for a given exam + subject and
 * saves them into the phone's local storage. If we already have them
 * cached, it skips downloading again — unless forceRefresh is true.
 */
export const downloadAndCacheQuestions = async (examBody, subject, forceRefresh = false) => {
  const database = await getDb();

  const alreadyCached = await hasCachedQuestions(examBody, subject);
  if (alreadyCached && !forceRefresh) {
    console.log(`Using cached questions for ${examBody} - ${subject}`);
    return;
  }

  console.log(`Downloading ${examBody} - ${subject} from Supabase...`);
  const remoteQuestions = await fetchQuestionsFromSupabase(examBody, subject);

  if (!remoteQuestions || remoteQuestions.length === 0) {
    console.log('No questions found on the server for this exam/subject.');
    return;
  }

  if (forceRefresh) {
    database.runSync(
      'DELETE FROM questions WHERE exam_body = ? AND subject = ?',
      [examBody, subject]
    );
  }

  database.execSync('BEGIN TRANSACTION');
  try {
    for (const q of remoteQuestions) {
      database.runSync(
        `INSERT INTO questions
          (remote_id, exam_body, institution_id, year, subject, topic, question_text,
           option_a, option_b, option_c, option_d, option_e, correct_option,
           explanation, instruction, passage, passage_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.id, q.exam_body, q.institution_id, q.year, q.subject, q.topic, q.question_text,
          q.option_a, q.option_b, q.option_c, q.option_d, q.option_e, q.correct_option,
          q.explanation, q.instruction, q.passage, q.passage_group,
        ]
      );
    }
    database.execSync('COMMIT');
    console.log(`Cached ${remoteQuestions.length} questions locally.`);
  } catch (error) {
    database.execSync('ROLLBACK');
    console.log('Error caching questions:', error);
    throw error;
  }
};
/**
 * Returns every distinct (exam_body, subject) pair currently cached
 * on this phone. Used by the "Refresh Questions" button in Settings,
 * so we know exactly what to re-download.
 */
export const getCachedSubjects = async () => {
  const database = await getDb();
  const results = database.getAllSync(
    `SELECT DISTINCT exam_body, subject FROM questions ORDER BY exam_body, subject`
  );
  return results; // e.g. [{ exam_body: 'JAMB', subject: 'Mathematics' }, ...]
};
/**
 * Given a list of currently-active broadcasts from Supabase, finds
 * the newest one this phone has NOT already shown to the student.
 * Returns null if there's nothing new to show.
 */
export const getUnseenBroadcast = async (activeBroadcasts) => {
  if (!activeBroadcasts || activeBroadcasts.length === 0) {
    return null;
  }

  const database = await getDb();

  for (const broadcast of activeBroadcasts) {
    const seen = database.getFirstSync(
      'SELECT broadcast_id FROM seen_broadcasts WHERE broadcast_id = ?',
      [broadcast.id]
    );

    if (!seen) {
      return broadcast;
    }
  }

  return null;
};

/**
 * Marks a broadcast as seen on this phone, so it never shows again.
 */
export const markBroadcastSeen = async (broadcastId) => {
  const database = await getDb();
  database.runSync(
    'INSERT OR REPLACE INTO seen_broadcasts (broadcast_id, seen_at) VALUES (?, ?)',
    [broadcastId, new Date().toISOString()]
  );
};