-- This file is your reference/notepad for all your tables.
-- The app does not run this file directly. It is for your eyes only.

-- Stores the student profile
CREATE TABLE IF NOT EXISTS student (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  class_level TEXT,
  device_id TEXT UNIQUE,
  trial_start_date TEXT,
  is_paid INTEGER DEFAULT 0
);

-- All questions from JAMB, WAEC, NECO, NABTEB, POST UTME
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  option_e TEXT,                  -- Optional fifth option
  correct_option TEXT NOT NULL,   -- A, B, C, D or E
  explanation TEXT,
  instruction TEXT,               -- Short instruction above the question
  passage TEXT,                   -- Comprehension text, poem or extract
  passage_group INTEGER,          -- Groups questions under the same passage
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- Higher institutions for Post UTME
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  abbreviation TEXT,
  category TEXT NOT NULL,
  state TEXT,
  has_post_utme INTEGER DEFAULT 1
);

-- Each time a student takes a quiz
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

-- Each individual answer a student gave
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  question_id INTEGER,
  student_answer TEXT,
  is_correct INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Wrong answers the student saves to notebook
CREATE TABLE IF NOT EXISTS notebook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  question_id INTEGER,
  date_added TEXT,
  FOREIGN KEY (student_id) REFERENCES student(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Payment and license per device
CREATE TABLE IF NOT EXISTS license (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE,
  payment_reference TEXT,
  payment_date TEXT,
  is_active INTEGER DEFAULT 1
);