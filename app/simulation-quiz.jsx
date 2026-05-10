// This screen handles one subject at a time during JAMB Simulation.
// It receives answers from the lobby and updates them as the student answers.
// When the student finishes a subject or switches, they return to the lobby.
// The timer lives in the lobby. This screen just shows the time passed in.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';

const SimulationQuizScreen = ({ route, navigation }) => {
  const {
    student,
    subjects,
    allQuestions,
    subjectQuestions,
    currentSubject,
    timerMinutes,
  } = route.params;

  // Get answers and timeLeft passed from lobby
  const [answers, setAnswers] = useState(route.params.answers || {});
  const [timeLeft, setTimeLeft] = useState(route.params.timeLeft || timerMinutes * 60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [switchModal, setSwitchModal] = useState(false);
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
          // Time up — go back to lobby which will handle auto submit
          goBackToLobby(true);
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

  // Tap selected option again to unselect
  const handleSelectOption = (option) => {
    const globalIndex = subjectQuestions[currentIndex].globalIndex;
    if (answers[globalIndex] === option) {
      const updated = { ...answers };
      delete updated[globalIndex];
      setAnswers(updated);
    } else {
      setAnswers((prev) => ({ ...prev, [globalIndex]: option }));
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < subjectQuestions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reached last question — auto go back to lobby
      goBackToLobby(false);
    }
  };

  // Return to lobby carrying updated answers and remaining time
  const goBackToLobby = (timeUp) => {
    clearInterval(timerRef.current);
    navigation.replace('SimulationLobby', {
      student,
      subjects,
      allQuestions,
      answers,
      timeLeft: timeUp ? 0 : timeLeft,
      timerMinutes,
    });
  };

  const handleSwitchSubject = () => {
    setSwitchModal(true);
  };

  const currentQuestion = subjectQuestions[currentIndex];
  const globalIndex = currentQuestion?.globalIndex;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarSubject}>{currentSubject}</Text>
          <Text style={styles.topBarExam}>JAMB Simulation</Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: getTimerColor() }]}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* ── SWITCH SUBJECT BUTTON ── */}
      <TouchableOpacity
        style={styles.switchButton}
        onPress={handleSwitchSubject}
      >
        <Text style={styles.switchButtonText}>⇄ Switch Subject</Text>
      </TouchableOpacity>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

        <View style={styles.yearTag}>
          <Text style={styles.yearTagText}>
            JAMB {currentQuestion?.year}
          </Text>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            Question {currentIndex + 1} of {subjectQuestions.length}
          </Text>
          <Text style={styles.questionText}>
            {currentQuestion?.question_text}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {[
            { key: 'A', value: currentQuestion?.option_a },
            { key: 'B', value: currentQuestion?.option_b },
            { key: 'C', value: currentQuestion?.option_c },
            { key: 'D', value: currentQuestion?.option_d },
          ].map((option) => {
            const isSelected = answers[globalIndex] === option.key;
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

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex + 1 === subjectQuestions.length && styles.doneButton,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex + 1 === subjectQuestions.length
                ? 'Done with Subject →'
                : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── QUESTION NUMBER GRID — FIXED AT BOTTOM ── */}
      <View style={styles.gridContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
        >
          {subjectQuestions.map((q, index) => {
            const gIndex = q.globalIndex;
            const isAnswered = answers[gIndex] !== undefined;
            const isCurrent = currentIndex === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.gridItem,
                  isAnswered && styles.gridItemAnswered,
                  isCurrent && styles.gridItemCurrent,
                ]}
                onPress={() => setCurrentIndex(index)}
              >
                <Text style={[
                  styles.gridItemText,
                  isAnswered && styles.gridItemTextAnswered,
                  isCurrent && styles.gridItemTextCurrent,
                ]}>
                  {index + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Switch Subject Modal */}
      <Modal visible={switchModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Switch Subject</Text>
            <Text style={styles.modalMessage}>
              Your answers for {currentSubject} are saved.
              Choose another subject to attempt.
            </Text>

            {subjects
              .filter((s) => s !== currentSubject)
              .map((subject) => (
                <TouchableOpacity
                  key={subject}
                  style={styles.subjectSwitchButton}
                  onPress={() => {
                    setSwitchModal(false);
                    clearInterval(timerRef.current);

                    const nextSubjectQuestions = allQuestions
                      .map((q, index) => ({ ...q, globalIndex: index }))
                      .filter((q) => q.simulation_subject === subject);

                    navigation.replace('SimulationQuiz', {
                      student,
                      subjects,
                      allQuestions,
                      subjectQuestions: nextSubjectQuestions,
                      currentSubject: subject,
                      answers,
                      timeLeft,
                      timerMinutes,
                    });
                  }}
                >
                  <Text style={styles.subjectSwitchText}>{subject}</Text>
                </TouchableOpacity>
              ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSwitchModal(false)}
            >
              <Text style={styles.cancelText}>Cancel — Stay Here</Text>
            </TouchableOpacity>
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
  topBarLeft: { flex: 1 },
  topBarSubject: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  topBarExam: { color: COLORS.secondary, fontSize: 12, marginTop: 2 },
  timerBox: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  timerText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  switchButton: {
    backgroundColor: 'rgba(26,26,46,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
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
  optionBadgeText: { fontWeight: 'bold', fontSize: 14, color: COLORS.textDark },
  optionBadgeTextSelected: { color: COLORS.white },
  optionText: { flex: 1, fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  optionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  navRow: {
    flexDirection: 'row',
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
  doneButton: { backgroundColor: COLORS.success },
  nextButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  gridContainer: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  gridContent: { paddingHorizontal: 8, gap: 6, alignItems: 'center' },
  gridItem: {
    width: 34,
    height: 34,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  subjectSwitchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectSwitchText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelText: { color: COLORS.textLight, fontSize: 14 },
});