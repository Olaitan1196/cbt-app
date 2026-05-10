import * as SQLite from 'expo-sqlite';

// We open the database once and reuse the same connection everywhere
let db = null;

export const getDb = () => {
  if (!db) {
    db = SQLite.openDatabaseSync('cbt_questions.db');
  }
  return db;
};

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDb();

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
          correct_option TEXT NOT NULL,
          explanation TEXT,
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
      `);

      console.log('Database initialized successfully');
      resolve();
    } catch (error) {
      console.log('Database init error:', error);
      reject(error);
    }
  });
};

export const seedSampleQuestions = () => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();

      const existing = db.getFirstSync('SELECT COUNT(*) as count FROM questions');

      if (existing.count > 0) {
        resolve();
        return;
      }

      db.execSync(`
        INSERT INTO questions
        (exam_body, institution_id, year, subject, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
        VALUES

        ('JAMB', NULL, 2020, 'Mathematics', 'Quadratic Equations',
        'Solve for x if x² - 5x + 6 = 0',
        'x = 2 and x = 3', 'x = 1 and x = 6', 'x = 2 and x = 4', 'x = 3 and x = 5',
        'A',
        'Factorising x² - 5x + 6 gives (x - 2)(x - 3) = 0. Therefore x = 2 or x = 3.'),

        ('JAMB', NULL, 2019, 'Mathematics', 'Quadratic Equations',
        'Find the roots of 2x² - 8x = 0',
        'x = 0 and x = 4', 'x = 2 and x = 4', 'x = 0 and x = 2', 'x = 1 and x = 4',
        'A',
        'Factorising gives 2x(x - 4) = 0. Therefore x = 0 or x = 4.'),

        ('JAMB', NULL, 2018, 'Mathematics', 'Quadratic Equations',
        'Which of these is a perfect square trinomial?',
        'x² + 6x + 9', 'x² + 5x + 9', 'x² + 6x + 8', 'x² + 4x + 9',
        'A',
        'x² + 6x + 9 = (x + 3)². This is a perfect square trinomial.'),

        ('JAMB', NULL, 2021, 'Mathematics', 'Indices',
        'Simplify 2³ × 2⁴',
        '2⁷', '2¹²', '4⁷', '2⁶',
        'A',
        'When multiplying same bases, add the powers. 3 + 4 = 7. Answer is 2⁷.'),

        ('JAMB', NULL, 2020, 'Mathematics', 'Indices',
        'Evaluate 5⁰',
        '1', '0', '5', 'undefined',
        'A',
        'Any number raised to the power of zero equals 1.'),

        ('JAMB', NULL, 2022, 'English Language', 'Comprehension',
        'The word "benevolent" most nearly means?',
        'Kind and generous', 'Strict and firm', 'Loud and boastful', 'Quiet and shy',
        'A',
        'Benevolent means well-meaning and kindly. It comes from Latin bene meaning good.'),

        ('JAMB', NULL, 2021, 'English Language', 'Comprehension',
        'Choose the word opposite in meaning to "verbose"',
        'Concise', 'Wordy', 'Lengthy', 'Talkative',
        'A',
        'Verbose means using more words than needed. Its antonym is concise meaning brief and to the point.'),

        ('JAMB', NULL, 2020, 'Biology', 'Cell Biology',
        'Which organelle is called the powerhouse of the cell?',
        'Mitochondria', 'Nucleus', 'Ribosome', 'Golgi apparatus',
        'A',
        'Mitochondria produces ATP energy for the cell through cellular respiration. That is why it is called the powerhouse.'),

        ('JAMB', NULL, 2019, 'Biology', 'Cell Biology',
        'The cell membrane is described as selectively permeable. This means it',
        'Allows only certain substances to pass through', 'Blocks all substances', 'Allows all substances through', 'Only allows water through',
        'A',
        'Selectively permeable means the membrane controls what enters and leaves the cell.'),

        ('JAMB', NULL, 2022, 'Physics', 'Motion',
        'A car accelerates from rest to 20m/s in 4 seconds. What is its acceleration?',
        '5 m/s²', '80 m/s²', '0.2 m/s²', '24 m/s²',
        'A',
        'Acceleration = change in velocity divided by time = 20 divided by 4 = 5 m/s².'),

        ('WAEC', NULL, 2021, 'Mathematics', 'Quadratic Equations',
        'Find the value of x if x² = 49',
        'x = ±7', 'x = 7 only', 'x = -7 only', 'x = ±9',
        'A',
        'Taking square root of both sides gives x = +7 or x = -7. Both values satisfy the equation.'),

        ('WAEC', NULL, 2020, 'English Language', 'Comprehension',
        'The plural of "phenomenon" is',
        'phenomena', 'phenomenons', 'phenomenas', 'phenomenon',
        'A',
        'Phenomenon is a Greek-origin word. Its correct plural form is phenomena.'),

        ('NECO', NULL, 2021, 'Mathematics', 'Indices',
        'Simplify (3²)³',
        '3⁶', '3⁵', '9³', '6²',
        'A',
        'When raising a power to another power multiply the indices. 2 × 3 = 6. Answer is 3⁶.'),

        ('NABTEB', NULL, 2020, 'Mathematics', 'Quadratic Equations',
        'The equation x² - 9 = 0 has solutions',
        'x = 3 and x = -3', 'x = 9 and x = -9', 'x = 3 only', 'x = 0 and x = 9',
        'A',
        'x² = 9 gives x = √9 = ±3. Therefore x = 3 or x = -3.');
      `);

      console.log('Sample questions inserted successfully');
      resolve();
    } catch (error) {
      console.log('Seed error:', error);
      reject(error);
    }
  });
};