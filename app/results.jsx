import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/colors';

const ResultsScreen = ({ route, navigation }) => {
  const {
    student,
    examBody,
    subject,
    correctCount,
    totalCount,
    scorePercentage,
    answers,
  } = route.params;

  // Grade the student based on score percentage
  const getGrade = () => {
    if (scorePercentage >= 70) return { grade: 'A', label: 'Excellent', color: COLORS.success };
    if (scorePercentage >= 60) return { grade: 'B', label: 'Good', color: '#4CAF50' };
    if (scorePercentage >= 50) return { grade: 'C', label: 'Average', color: COLORS.warning };
    if (scorePercentage >= 40) return { grade: 'D', label: 'Below Average', color: '#FF7043' };
    return { grade: 'F', label: 'Poor', color: COLORS.error };
  };

  // Potential mark — this estimates what the student would score
  // in the real exam if they maintained this performance
  // JAMB is out of 400, WAEC/NECO/NABTEB use percentage, Post UTME varies
  const getPotentialMark = () => {
    // For single subject JAMB practice, score is out of 100.
    // The 400 total only applies when all four subjects are combined.
    // That calculation happens in the Simulation screen, not here.
    // We leave this open for future exam bodies by using a switch structure.

    switch (examBody) {
      case 'JAMB':
        return {
          score: Math.round(scorePercentage),
          outOf: 100,
          label: 'Potential Score (This Subject)',
          note: 'Full JAMB score out of 400 is calculated in Simulation mode where all 4 subjects are combined.',
        };
      case 'WAEC':
      case 'NECO':
      case 'NABTEB':
      case 'POST_UTME':
      default:
        return {
          score: Math.round(scorePercentage),
          outOf: 100,
          label: 'Potential Score',
          note: '',
        };
    }
  };

  const gradeInfo = getGrade();
  const potential = getPotentialMark();
  const wrongAnswers = answers.filter((a) => !a.is_correct);
  const skippedAnswers = answers.filter((a) => a.student_answer === null || a.student_answer === 'NOT_ANSWERED');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── SCORE HEADER ── */}
        <View style={[styles.header, { backgroundColor: gradeInfo.color }]}>
          <Text style={styles.gradeText}>{gradeInfo.grade}</Text>
          <Text style={styles.gradeLabel}>{gradeInfo.label}</Text>
          <Text style={styles.scoreText}>
            {correctCount} / {totalCount}
          </Text>
          <Text style={styles.percentText}>
            {Math.round(scorePercentage)}%
          </Text>
          <Text style={styles.subjectLabel}>
            {subject} — {examBody}
          </Text>
        </View>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{correctCount}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.error }]}>
              {wrongAnswers.length - skippedAnswers.length}
            </Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>
              {skippedAnswers.length}
            </Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
        </View>

        {/* ── POTENTIAL MARK ── */}
        <View style={styles.potentialCard}>
          <Text style={styles.potentialLabel}>{potential.label}</Text>
          <Text style={styles.potentialScore}>
            {potential.score}
            <Text style={styles.potentialOutOf}> / {potential.outOf}</Text>
          </Text>
          {potential.note ? (
            <Text style={styles.potentialNote}>{potential.note}</Text>
          ) : (
            <Text style={styles.potentialNote}>
              This is your estimated score if you sat for this exam today
              based on your current performance.
            </Text>
          )}
        </View>

        {/* ── ANSWER REVIEW ── */}
        <Text style={styles.sectionTitle}>Answer Review</Text>

        {answers.map((answer, index) => {
          const isSkipped =
            answer.student_answer === null ||
            answer.student_answer === 'NOT_ANSWERED';

          return (
            <View
              key={index}
              style={[
                styles.answerCard,
                answer.is_correct
                  ? styles.answerCorrect
                  : isSkipped
                  ? styles.answerSkipped
                  : styles.answerWrong,
              ]}
            >
              {/* Question number and status */}
              <View style={styles.answerHeader}>
                <Text style={styles.answerNumber}>Q{index + 1}</Text>
                <Text style={styles.answerStatus}>
                  {answer.is_correct
                    ? '✅ Correct'
                    : isSkipped
                    ? '⏭ Skipped'
                    : '❌ Wrong'}
                </Text>
              </View>

              {/* Question text */}
              <Text style={styles.answerQuestion}>
                {answer.question.question_text}
              </Text>

              {/* What student answered */}
              {!isSkipped && (
                <Text style={styles.answerYours}>
                  Your answer: {answer.student_answer} —{' '}
                  {answer.question[`option_${answer.student_answer.toLowerCase()}`]}
                </Text>
              )}

              {/* Correct answer — always show */}
              <Text style={styles.answerCorrectText}>
                Correct answer: {answer.question.correct_option} —{' '}
                {answer.question[`option_${answer.question.correct_option.toLowerCase()}`]}
              </Text>

              {/* Explanation — show if available */}
              {answer.question.explanation ? (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationLabel}>📖 Explanation</Text>
                  <Text style={styles.explanationText}>
                    {answer.question.explanation}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('Notebook', { student })
            }
          >
            <Text style={styles.secondaryButtonText}>📓 View Notebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('Performance', { student })
            }
          >
            <Text style={styles.secondaryButtonText}>📊 View Performance</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ResultsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 30,
    alignItems: 'center',
    paddingTop: 50,
  },
  gradeText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  gradeLabel: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  percentText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  subjectLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    elevation: 4,
    padding: 16,
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  potentialCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  potentialLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  potentialScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  potentialOutOf: {
    fontSize: 20,
    color: COLORS.textLight,
  },
  potentialNote: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  answerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 5,
  },
  answerCorrect: {
    backgroundColor: '#f0fff4',
    borderLeftColor: COLORS.success,
  },
  answerWrong: {
    backgroundColor: '#fff5f5',
    borderLeftColor: COLORS.error,
  },
  answerSkipped: {
    backgroundColor: '#fffdf0',
    borderLeftColor: COLORS.warning,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  answerNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  answerStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  answerQuestion: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 22,
    marginBottom: 10,
    fontWeight: '500',
  },
  answerYours: {
    fontSize: 13,
    color: COLORS.error,
    marginBottom: 4,
  },
  answerCorrectText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationBox: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  buttonGroup: {
    padding: 16,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});