// This is the Simulation Lobby Screen.
// It appears after the student confirms their 4 subjects.
// The 90 minute countdown starts here and never stops until submission.
// The student picks which subject to attempt from this screen.
// They can come back here freely to switch subjects.
// Submit is only done from this screen.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/localCache';

const SimulationLobbyScreen = ({ route, navigation }) => {
  const {
    student,
    subjects,
    allQuestions,
    timerMinutes,
  } = route.params;

  // Shared answers object across all subjects
  // Key is the question index in allQuestions array
  const [answers, setAnswers] = useState(
    route.params.answers || {}
  );

  const [timeLeft, setTimeLeft] = useState(
    route.params.timeLeft || timerMinutes * 60
  );

  const [autoSubmitModal, setAutoSubmitModal] = useState(false);
  const [warnModal, setWarnModal] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [unansweredBySubject, setUnansweredBySubject] = useState({});
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

  // Count how many questions are answered per subject
  const getSubjectProgress = (subject) => {
    const subjectQuestions = allQuestions
      .map((q, index) => ({ ...q, globalIndex: index }))
      .filter((q) => q.simulation_subject === subject);

    const answered = subjectQuestions.filter(
      (q) => answers[q.globalIndex] !== undefined
    ).length;

    return { answered, total: subjectQuestions.length };
  };

  // When student taps a subject to attempt
  const handleSelectSubject = (subject) => {
    clearInterval(timerRef.current);

    // Get only this subject's questions with their global indexes
    const subjectQuestions = allQuestions
      .map((q, index) => ({ ...q, globalIndex: index }))
      .filter((q) => q.simulation_subject === subject);

    navigation.navigate('SimulationQuiz', {
      student,
      subjects,
      allQuestions,
      subjectQuestions,
      currentSubject: subject,
      answers,
      timeLeft,
      timerMinutes,
    });
  };

  // When student taps Submit from lobby
  const handleSubmitPress = () => {
    const unanswered = allQuestions.filter(
      (_, index) => answers[index] === undefined
    ).length;

    // Count unanswered per subject for the warning
    const bySubject = {};
    for (const subject of subjects) {
      const subjectQuestions = allQuestions
        .map((q, index) => ({ ...q, globalIndex: index }))
        .filter((q) => q.simulation_subject === subject);
      const unansweredInSubject = subjectQuestions.filter(
        (q) => answers[q.globalIndex] === undefined
      ).length;
      bySubject[subject] = unansweredInSubject;
    }

    setUnansweredCount(unanswered);
    setUnansweredBySubject(bySubject);

    if (unanswered > 0) {
      setWarnModal(true);
    } else {
      submitExam();
    }
  };

  const submitExam = async () => {
    clearInterval(timerRef.current);

    try {
      const db = await getDb();
      const today = new Date().toISOString();

      const finalAnswers = allQuestions.map((question, index) => ({
        question_id: question.id,
        question: question,
        student_answer: answers[index] || null,
        is_correct:
          answers[index] !== undefined &&
          answers[index] === question.correct_option,
        simulation_subject: question.simulation_subject,
      }));

      // Calculate score per subject — each subject is out of 100
      const subjectScores = {};
      for (const subject of subjects) {
        const subjectAnswers = finalAnswers.filter(
          (a) => a.simulation_subject === subject
        );
        const subjectTotal = subjectAnswers.length;
        const subjectCorrect = subjectAnswers.filter(
          (a) => a.is_correct
        ).length;
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

      const totalScore = Object.values(subjectScores).reduce(
        (sum, s) => sum + s.score,
        0
      );

      const overallCorrect = finalAnswers.filter((a) => a.is_correct).length;

      const sessionResult = db.runSync(
        `INSERT INTO sessions
         (student_id, exam_body, subject, date_taken, total_questions, correct_answers, score_percentage)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id,
          'JAMB_SIMULATION',
          subjects.join(', '),
          today,
          allQuestions.length,
          overallCorrect,
          (totalScore / 400) * 100,
        ]
      );

      const sessionId = sessionResult.lastInsertRowId;

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

      navigation.replace('SimulationResults', {
        student,
        subjects,
        subjectScores,
        totalScore,
        answers: finalAnswers,
        sessionId,
      });

    } catch (error) {
      console.log('Submit error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>JAMB Simulation</Text>
        <Text style={styles.headerSubtitle}>
          Select a subject to attempt
        </Text>
      </View>

      {/* ── TIMER ── */}
      <View style={[styles.timerCard, { backgroundColor: getTimerColor() }]}>
        <Text style={styles.timerLabel}>Time Remaining</Text>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        <Text style={styles.timerNote}>
          Timer runs across all subjects
        </Text>
      </View>

      {/* ── SUBJECT LIST ── */}
      <View style={styles.subjectList}>
        {subjects.map((subject, index) => {
          const progress = getSubjectProgress(subject);
          const isComplete = progress.answered === progress.total;
          const percentDone =
            progress.total > 0
              ? (progress.answered / progress.total) * 100
              : 0;

          return (
            <TouchableOpacity
              key={subject}
              style={styles.subjectCard}
              onPress={() => handleSelectSubject(subject)}
            >
              {/* Subject number and name */}
              <View style={styles.subjectLeft}>
                <View style={styles.subjectNumberBox}>
                  <Text style={styles.subjectNumber}>{index + 1}</Text>
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <Text style={styles.subjectProgress}>
                    {progress.answered} of {progress.total} answered
                  </Text>
                  {/* Progress bar */}
                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percentDone}%` },
                        isComplete
                          ? { backgroundColor: COLORS.success }
                          : { backgroundColor: COLORS.secondary },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Status indicator */}
              <View style={styles.subjectRight}>
                {isComplete ? (
                  <Text style={styles.doneText}>✅</Text>
                ) : (
                  <Text style={styles.attemptText}>Attempt →</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── TOTAL PROGRESS ── */}
      <View style={styles.totalProgress}>
        <Text style={styles.totalProgressText}>
          Total: {Object.keys(answers).length} of {allQuestions.length} questions answered
        </Text>
      </View>

      {/* ── SUBMIT BUTTON ── */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitPress}
        >
          <Text style={styles.submitButtonText}>Submit Exam</Text>
        </TouchableOpacity>
      </View>

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
                submitExam();
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
              You have {unansweredCount} unanswered question
              {unansweredCount !== 1 ? 's' : ''}:
            </Text>

            {/* Show breakdown per subject */}
            {subjects.map((subject) => {
              const count = unansweredBySubject[subject] || 0;
              if (count === 0) return null;
              return (
                <Text key={subject} style={styles.unansweredSubject}>
                  • {subject}: {count} unanswered
                </Text>
              );
            })}

            <Text style={styles.modalMessage}>
              Do you still want to submit?
            </Text>

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
                  submitExam();
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

export default SimulationLobbyScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  timerCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  timerNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  subjectList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  subjectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
  },
  subjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  subjectNumberBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  subjectInfo: { flex: 1 },
  subjectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  subjectProgress: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  progressBackground: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    height: 5,
  },
  progressFill: {
    borderRadius: 10,
    height: 5,
  },
  subjectRight: { marginLeft: 10 },
  doneText: { fontSize: 22 },
  attemptText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  totalProgress: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  totalProgressText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  submitButton: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
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
  unansweredSubject: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '600',
    marginBottom: 4,
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