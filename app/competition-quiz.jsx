import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { saveAnswer, completeAttempt } from '../services/competitionAttemptService';

export default function CompetitionQuizScreen({ route, navigation }) {
  const {
    student,
    participant,
    tierNumber,
    attemptId,
    allQuestions,
    secondsPerQuestion,
  } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const [advancing, setAdvancing] = useState(false);

  // Same passage/instruction handling as the main quiz screen
  const [currentPassage, setCurrentPassage] = useState(null);
  const [currentInstruction, setCurrentInstruction] = useState(null);

  const totalsRef = useRef({ points: 0, correct: 0, missed: 0, wrong: 0, timeMs: 0 });
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const attemptStartRef = useRef(Date.now());

  const currentQuestion = allQuestions[currentIndex];

  useEffect(() => {
    setSelectedOption(null);
    setTimeLeft(secondsPerQuestion);
    startTimeRef.current = Date.now();
    updatePassageAndInstruction(currentIndex);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAdvance(true); // true = timed out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  // Finds the right passage and instruction for the current question —
  // same logic as the main quiz screen, since passages can span several
  // questions in a row using passage_group.
  const updatePassageAndInstruction = (index) => {
    const question = allQuestions[index];
    if (!question) return;

    setCurrentInstruction(question.instruction || null);

    if (question.passage) {
      setCurrentPassage(question.passage);
    } else if (question.passage_group) {
      for (let i = index - 1; i >= 0; i--) {
        if (
          allQuestions[i].passage_group === question.passage_group &&
          allQuestions[i].passage
        ) {
          setCurrentPassage(allQuestions[i].passage);
          return;
        }
      }
      setCurrentPassage(null);
    } else {
      setCurrentPassage(null);
    }
  };

  const getTimerColor = () => {
    const percent = (timeLeft / secondsPerQuestion) * 100;
    if (percent > 50) return COLORS.success;
    if (percent > 25) return COLORS.warning;
    return COLORS.error;
  };

  const handleAdvance = async (timedOut) => {
    if (advancing) return;
    setAdvancing(true);
    clearInterval(timerRef.current);

    const timeTakenMs = Date.now() - startTimeRef.current;
    const isMissed = timedOut || !selectedOption;
    const isCorrect = !isMissed && selectedOption === currentQuestion.correct_option;
    const pointsEarned = isCorrect ? currentQuestion.points_per_question : 0;

    totalsRef.current.points += pointsEarned;
    totalsRef.current.timeMs += timeTakenMs;
    if (isCorrect) totalsRef.current.correct += 1;
    else if (isMissed) totalsRef.current.missed += 1;
    else totalsRef.current.wrong += 1;

    try {
      await saveAnswer({
        attemptId,
        questionId: currentQuestion.id,
        subject: currentQuestion.competition_subject,
        isCorrect,
        isMissed,
        pointsEarned,
        timeTakenMs,
      });
    } catch (error) {
      console.log('Could not save answer:', error);
    }

    if (currentIndex + 1 < allQuestions.length) {
      setCurrentIndex(currentIndex + 1);
      setAdvancing(false);
    } else {
      finishAttempt();
    }
  };

  const finishAttempt = async () => {
    try {
      const result = await completeAttempt({
        attemptId,
        participantId: participant.id,
        tierNumber,
        totalPoints: Math.round(totalsRef.current.points * 100) / 100,
        correctCount: totalsRef.current.correct,
        missedCount: totalsRef.current.missed,
        wrongCount: totalsRef.current.wrong,
        totalTimeMs: totalsRef.current.timeMs,
      });

      navigation.replace('CompetitionAttemptResults', {
        student,
        tierNumber,
        totalPoints: Math.round(totalsRef.current.points * 100) / 100,
        correctCount: totalsRef.current.correct,
        missedCount: totalsRef.current.missed,
        wrongCount: totalsRef.current.wrong,
        totalQuestions: allQuestions.length,
        outcome: result.outcome,
        newTier: result.newTier,
      });
    } catch (error) {
      Alert.alert('Error Saving Result', 'Your attempt finished but we could not save the result. Please contact support.');
    }
  };

  // Build options dynamically — supports both 4-option and 5-option questions
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
          <Text style={styles.topBarSubject}>{currentQuestion.competition_subject}</Text>
          <Text style={styles.topBarExam}>
            Tier {tierNumber} — Question {currentIndex + 1} of {allQuestions.length}
          </Text>
        </View>
        <View style={[styles.timerBox, { backgroundColor: getTimerColor() }]}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

        {/* ── YEAR TAG ── */}
        <View style={styles.yearTag}>
          <Text style={styles.yearTagText}>JAMB {currentQuestion.year}</Text>
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
            Question {currentIndex + 1} of {allQuestions.length}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        {/* ── OPTIONS ── */}
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const isSelected = selectedOption === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionButton, isSelected && styles.optionSelected]}
                onPress={() => setSelectedOption(option.key)}
                disabled={advancing}
              >
                <View style={[styles.optionBadge, isSelected && styles.optionBadgeSelected]}>
                  <Text style={[styles.optionBadgeText, isSelected && styles.optionBadgeTextSelected]}>
                    {option.key}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── NEXT / FINISH BUTTON — no Previous, no grid: forward-only ── */}
        <TouchableOpacity
          style={[styles.nextButton, !selectedOption && styles.nextButtonDisabled]}
          onPress={() => handleAdvance(false)}
          disabled={!selectedOption || advancing}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex + 1 === allQuestions.length ? 'Finish' : 'Next →'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginTop: 12,
    marginBottom: 12,
  },
  yearTagText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
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
  passageText: { fontSize: 13, color: COLORS.textDark, lineHeight: 22 },
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
  questionText: { fontSize: 16, color: COLORS.textDark, lineHeight: 26, fontWeight: '500' },
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
  optionBadgeSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionBadgeText: { fontWeight: 'bold', fontSize: 14, color: COLORS.textDark },
  optionBadgeTextSelected: { color: COLORS.white },
  optionText: { flex: 1, fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  optionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  nextButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonDisabled: { backgroundColor: COLORS.border },
  nextButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});