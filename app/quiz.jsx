import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/localCache';

const QuizScreen = ({ route, navigation }) => {
  const {
    student,
    examBody,
    institution,
    subject,
    topic,
    questionCount,
    timerMinutes,
    yearFrom,
    yearTo,
  } = route.params;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(timerMinutes * 60);
  const [loading, setLoading] = useState(true);
  const [autoSubmitModal, setAutoSubmitModal] = useState(false);
  const [warnModal, setWarnModal] = useState(false);
  const [unansweredList, setUnansweredList] = useState([]);

  // For passage — we store the current passage to display
  const [currentPassage, setCurrentPassage] = useState(null);
  const [currentInstruction, setCurrentInstruction] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    loadQuestions();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      startTimer();
      updatePassageAndInstruction(0);
    }
  }, [questions]);

  // When current question changes, update the passage and instruction
  useEffect(() => {
    if (questions.length > 0) {
      updatePassageAndInstruction(currentIndex);
    }
  }, [currentIndex]);

  // Find the correct passage and instruction for the current question
  const updatePassageAndInstruction = (index) => {
    const question = questions[index];
    if (!question) return;

    // Set instruction
    setCurrentInstruction(question.instruction || null);

    // Handle passage
    if (question.passage) {
      // This question itself has a passage — show it
      setCurrentPassage(question.passage);
    } else if (question.passage_group) {
      // Look backwards to find the passage for this group
      for (let i = index - 1; i >= 0; i--) {
        if (
          questions[i].passage_group === question.passage_group &&
          questions[i].passage
        ) {
          setCurrentPassage(questions[i].passage);
          return;
        }
      }
      setCurrentPassage(null);
    } else {
      setCurrentPassage(null);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setAutoSubmitModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const loadQuestions = async () => {
    try {
      const db = await getDb();
      const limit = questionCount || 100;
      let results = [];

      const yearClause =
        yearFrom && yearTo
          ? `AND year >= ${yearFrom} AND year <= ${yearTo}`
          : '';
      console.log(`Attempting fetch: Body=${examBody}, Subj=${subject}, Topic=${topic}, Limit=${limit}`);

      if (topic) {
        if (examBody === 'POST_UTME' && institution) {
          results = await db.getAllSync(
            `SELECT * FROM questions
             WHERE exam_body = ? AND subject = ? AND topic = ? AND institution_id = ?
             ${yearClause}
             ORDER BY year ASC, id ASC LIMIT ?`,
            [examBody, subject, topic, institution.id, limit]
          );
        } else {
          results = await db.getAllSync(
            `SELECT * FROM questions
             WHERE exam_body = ? AND subject = ? AND topic = ?
             ${yearClause}
             ORDER BY year ASC, id ASC LIMIT ?`,
            [examBody, subject, topic, limit]
          );
        }
      } else {
        if (examBody === 'POST_UTME' && institution) {
          results = await db.getAllSync(
            `SELECT * FROM questions
             WHERE exam_body = ? AND subject = ? AND institution_id = ?
             ${yearClause}
             ORDER BY year ASC, id ASC LIMIT ?`,
            [examBody, subject, institution.id, limit]
          );
        } else {
          results = await db.getAllSync(
            `SELECT * FROM questions
             WHERE exam_body = ? AND subject = ?
             ${yearClause}
             ORDER BY year ASC, id ASC LIMIT ?`,
            [examBody, subject, limit]
          );
        }
      }
      console.log(`Successfully fetched ${results ? results.length : 0} questions from DB.`);

      setQuestions(results);
    } catch (error) {
      console.log('Quiz load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const total = timerMinutes * 60;
    const percent = (timeLeft / total) * 100;
    if (percent > 50) return COLORS.success;
    if (percent > 25) return COLORS.warning;
    return COLORS.error;
  };

  // Tap same option again to unselect
  const handleSelectOption = (option) => {
    if (answers[currentIndex] === option) {
      const updated = { ...answers };
      delete updated[currentIndex];
      setAnswers(updated);
    } else {
      setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) setCurrentIndex(currentIndex + 1);
  };

  const handleSubmitPress = () => {
    const unanswered = questions
      .map((_, index) => index)
      .filter((index) => answers[index] === undefined);

    if (unanswered.length > 0) {
      setUnansweredList(unanswered.map((i) => i + 1));
      setWarnModal(true);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    clearInterval(timerRef.current);

    try {
      const db = await getDb();
      const today = new Date().toISOString();

      const finalAnswers = questions.map((question, index) => ({
        question_id: question.id,
        question: question,
        student_answer: answers[index] || null,
        is_correct:
          answers[index] !== undefined &&
          answers[index] === question.correct_option,
      }));

      const correctCount = finalAnswers.filter((a) => a.is_correct).length;
      const totalCount = questions.length;
      const scorePercentage =
        totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

      const sessionResult = await db.runSync(
        `INSERT INTO sessions
         (student_id, exam_body, subject, date_taken, total_questions, correct_answers, score_percentage)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student.id, examBody, subject, today, totalCount, correctCount, scorePercentage]
      );

      const sessionId = sessionResult.lastInsertRowId;

      for (const answer of finalAnswers) {
        await db.runSync(
          `INSERT INTO answers (session_id, question_id, student_answer, is_correct)
           VALUES (?, ?, ?, ?)`,
          [
            sessionId,
            answer.question_id,
            answer.student_answer || 'NOT_ANSWERED',
            answer.is_correct ? 1 : 0,
          ]
        );

        if (!answer.is_correct) {
          await db.runSync(
            `INSERT OR IGNORE INTO notebook (student_id, question_id, date_added)
             VALUES (?, ?, ?)`,
            [student.id, answer.question_id, today]
          );
        }
      }

      navigation.replace('Results', {
        student,
        examBody,
        subject,
        sessionId,
        correctCount,
        totalCount,
        scorePercentage,
        answers: finalAnswers,
      });
    } catch (error) {
      console.log('Submit error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>No Questions Found</Text>
        <Text style={styles.emptySubText}>
          There are no questions available for this selection yet.
        </Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];

  // Build the list of options dynamically
  // This handles both 4-option and 5-option questions
  const options = [
    { key: 'A', value: currentQuestion.option_a },
    { key: 'B', value: currentQuestion.option_b },
    { key: 'C', value: currentQuestion.option_c },
    { key: 'D', value: currentQuestion.option_d },
  ];
  if (currentQuestion.option_e) {
    options.push({ key: 'E', value: currentQuestion.option_e });
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarSubject}>{subject}</Text>
          <Text style={styles.topBarExam}>{examBody}</Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: getTimerColor() }]}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

        {/* ── YEAR TAG ── */}
        <View style={styles.yearTag}>
          <Text style={styles.yearTagText}>
            {examBody} {currentQuestion.year}
          </Text>
        </View>

        {/* ── INSTRUCTION (if any) ── */}
        {currentInstruction ? (
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>{currentInstruction}</Text>
          </View>
        ) : null}

        {/* ── PASSAGE (if any) ── */}
        {currentPassage ? (
          <View style={styles.passageBox}>
            <Text style={styles.passageLabel}>📖 Read the passage below</Text>
            <Text style={styles.passageText}>{currentPassage}</Text>
          </View>
        ) : null}

        {/* ── QUESTION ── */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.questionText}>
            {currentQuestion.question_text}
          </Text>
        </View>

        {/* ── OPTIONS ── */}
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const isSelected = answers[currentIndex] === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => handleSelectOption(option.key)}
              >
                <View style={[
                  styles.optionBadge,
                  isSelected && styles.optionBadgeSelected,
                ]}>
                  <Text style={[
                    styles.optionBadgeText,
                    isSelected && styles.optionBadgeTextSelected,
                  ]}>
                    {option.key}
                  </Text>
                </View>
                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}>
                  {option.value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── NAVIGATION BUTTONS ── */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Text style={styles.navButtonText}>← Previous</Text>
          </TouchableOpacity>

          {currentIndex + 1 < questions.length ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitPress}
            >
              <Text style={styles.nextButtonText}>Submit Quiz</Text>
            </TouchableOpacity>
          )}
        </View>

        {currentIndex + 1 < questions.length && (
          <TouchableOpacity
            style={styles.earlySubmitButton}
            onPress={handleSubmitPress}
          >
            <Text style={styles.earlySubmitText}>Submit Quiz Early</Text>
          </TouchableOpacity>
        )}

        {/* ── QUESTION NUMBER GRID ── */}
        <View style={styles.gridContainer}>
          <Text style={styles.gridLabel}>Question Navigator</Text>
          <View style={styles.gridWrapper}>
            {questions.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.gridItem,
                  answers[index] !== undefined && styles.gridItemAnswered,
                  currentIndex === index && styles.gridItemCurrent,
                ]}
                onPress={() => setCurrentIndex(index)}
              >
                <Text style={[
                  styles.gridItemText,
                  answers[index] !== undefined && styles.gridItemTextAnswered,
                  currentIndex === index && styles.gridItemTextCurrent,
                ]}>
                  {index + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Answered</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border }]} />
              <Text style={styles.legendText}>Not answered</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.secondary }]} />
              <Text style={styles.legendText}>Current</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Auto submit modal */}
      <Modal visible={autoSubmitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>⏰</Text>
            <Text style={styles.modalTitle}>Time is Up!</Text>
            <Text style={styles.modalMessage}>
              Your time has finished. You have been submitted automatically.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setAutoSubmitModal(false);
                submitQuiz();
              }}
            >
              <Text style={styles.modalButtonText}>See My Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unanswered warning modal */}
      <Modal visible={warnModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Unanswered Questions</Text>
            <Text style={styles.modalMessage}>
              You have not answered question
              {unansweredList.length > 1 ? 's' : ''}: {unansweredList.join(', ')}
            </Text>
            <Text style={styles.modalMessage}>Do you still want to submit?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonOutline}
                onPress={() => setWarnModal(false)}
              >
                <Text style={styles.modalButtonOutlineText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setWarnModal(false);
                  submitQuiz();
                }}
              >
                <Text style={styles.modalButtonText}>Submit Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default QuizScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  loadingText: { fontSize: 16, color: COLORS.textLight },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBackText: { color: COLORS.white, fontWeight: 'bold' },
  topBar: {
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarSubject: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  topBarExam: { color: COLORS.secondary, fontSize: 12, marginTop: 2 },
  timerBox: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  timerText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  scrollArea: { flex: 1, padding: 16 },
  yearTag: {
    backgroundColor: COLORS.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  yearTagText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },

  // Instruction box
  instructionBox: {
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Passage box
  passageBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  passageLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 8,
  },
  passageText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 22,
  },

  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    elevation: 1,
  },
  questionNumber: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 8,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 26,
    fontWeight: '500',
  },
  optionsContainer: { gap: 10, marginBottom: 24 },
  optionButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#eef0ff',
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionBadgeSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: COLORS.textDark,
  },
  optionBadgeTextSelected: { color: COLORS.white },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  optionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonDisabled: { borderColor: COLORS.border },
  navButtonText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  nextButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  earlySubmitButton: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  earlySubmitText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  gridContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridItemAnswered: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  gridItemCurrent: { borderColor: COLORS.secondary, borderWidth: 2 },
  gridItemText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textDark },
  gridItemTextAnswered: { color: COLORS.white },
  gridItemTextCurrent: { color: COLORS.secondary },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  modalButtonOutline: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonOutlineText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});