// This is the Simulation Quiz Screen.
// It is only used for JAMB Simulation mode.
// It handles 180 questions across 4 subjects.
// Score is calculated out of 400 at the end.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/db';

const SimulationQuizScreen = ({ route, navigation }) => {
  const { student, questions, subjects, timerMinutes } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(timerMinutes * 60);
  const [autoSubmitModal, setAutoSubmitModal] = useState(false);
  const [warnModal, setWarnModal] = useState(false);
  const [unansweredList, setUnansweredList] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

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

  const handleSelectOption = (option) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
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
      .filter((index) => !answers[index]);

    if (unanswered.length > 0) {
      setUnansweredList(unanswered.map((i) => i + 1));
      setWarnModal(true);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = () => {
    clearInterval(timerRef.current);

    try {
      const db = getDb();
      const today = new Date().toISOString();

      // Build final answers array
      const finalAnswers = questions.map((question, index) => ({
        question_id: question.id,
        question: question,
        student_answer: answers[index] || null,
        is_correct:
          answers[index] !== undefined &&
          answers[index] === question.correct_option,
        simulation_subject: question.simulation_subject,
      }));

      // Calculate scores per subject
      // Each subject is marked out of 100 regardless of question count
      const subjectScores = {};
      for (const subject of subjects) {
        const subjectAnswers = finalAnswers.filter(
          (a) => a.simulation_subject === subject
        );
        const subjectTotal = subjectAnswers.length;
        const subjectCorrect = subjectAnswers.filter((a) => a.is_correct).length;
        // Scale to 100 marks per subject
        const subjectScore =
          subjectTotal > 0
            ? Math.round((subjectCorrect / subjectTotal) * 100)
            : 0;
        subjectScores[subject] = {
          correct: subjectCorrect,
          total: subjectTotal,
          score: subjectScore,
        };
      }

      // Total score out of 400
      const totalScore = Object.values(subjectScores).reduce(
        (sum, s) => sum + s.score,
        0
      );

      const overallCorrect = finalAnswers.filter((a) => a.is_correct).length;

      // Save one session record for the simulation
      const sessionResult = db.runSync(
        `INSERT INTO sessions
         (student_id, exam_body, subject, date_taken, total_questions, correct_answers, score_percentage)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id,
          'JAMB_SIMULATION',
          subjects.join(', '),
          today,
          questions.length,
          overallCorrect,
          (totalScore / 400) * 100,
        ]
      );

      const sessionId = sessionResult.lastInsertRowId;

      // Save individual answers
      for (const answer of finalAnswers) {
        db.runSync(
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
          db.runSync(
            `INSERT OR IGNORE INTO notebook (student_id, question_id, date_added)
             VALUES (?, ?, ?)`,
            [student.id, answer.question_id, today]
          );
        }
      }

      // Go to simulation results screen
      navigation.replace('SimulationResults', {
        student,
        subjects,
        subjectScores,
        totalScore,
        answers: finalAnswers,
        sessionId,
      });

    } catch (error) {
      console.log('Simulation submit error:', error);
    }
  };

  const currentQuestion = questions[currentIndex];

  // Find which subject this question belongs to
  const currentSubject = currentQuestion?.simulation_subject || '';

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>JAMB Simulation</Text>
          <Text style={styles.topBarSubject}>{currentSubject}</Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: getTimerColor() }]}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* ── QUESTION NUMBER GRID ── */}
      <View style={styles.gridWrapper}>
        <FlatList
          data={questions}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item, index }) => (
            <TouchableOpacity
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
          )}
        />
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

        {/* Year tag */}
        <View style={styles.yearTag}>
          <Text style={styles.yearTagText}>
            JAMB {currentQuestion?.year}
          </Text>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.questionText}>
            {currentQuestion?.question_text}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {[
            { key: 'A', value: currentQuestion?.option_a },
            { key: 'B', value: currentQuestion?.option_b },
            { key: 'C', value: currentQuestion?.option_c },
            { key: 'D', value: currentQuestion?.option_d },
          ].map((option) => {
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

        {/* Navigation */}
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
              <Text style={styles.nextButtonText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>

        {currentIndex + 1 < questions.length && (
          <TouchableOpacity
            style={styles.earlySubmitButton}
            onPress={handleSubmitPress}
          >
            <Text style={styles.earlySubmitText}>Submit Exam Early</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Auto submit modal */}
      <Modal visible={autoSubmitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>⏰</Text>
            <Text style={styles.modalTitle}>Time is Up!</Text>
            <Text style={styles.modalMessage}>
              Your 90 minutes have finished. You have been submitted automatically.
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
              {unansweredList.length > 1 ? 's' : ''}{' '}
              {unansweredList.join(', ')}.
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

export default SimulationQuizScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  topBarSubject: { color: COLORS.secondary, fontSize: 12, marginTop: 2 },
  timerBox: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  timerText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  gridWrapper: {
    backgroundColor: COLORS.primary,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  gridContent: { paddingHorizontal: 8, gap: 6 },
  gridItem: {
    width: 32,
    height: 32,
    borderRadius: 6,
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
  gridItemText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textDark },
  gridItemTextAnswered: { color: COLORS.white },
  gridItemTextCurrent: { color: COLORS.secondary },
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
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#eef0ff' },
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
  optionBadgeText: { fontWeight: 'bold', fontSize: 14, color: COLORS.textDark },
  optionBadgeTextSelected: { color: COLORS.white },
  optionText: { flex: 1, fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
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
    marginBottom: 10,
  },
  earlySubmitText: { color: COLORS.secondary, fontWeight: 'bold', fontSize: 14 },
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