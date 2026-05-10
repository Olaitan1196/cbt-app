// This is the Simulation Results Screen.
// It shows the student their score out of 400 broken down per subject.

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

const SimulationResultsScreen = ({ route, navigation }) => {
  const {
    student,
    subjects,
    subjectScores,
    totalScore,
    answers,
    sessionId,
  } = route.params;

  const getGrade = (score) => {
    if (score >= 280) return { grade: 'A', label: 'Excellent', color: COLORS.success };
    if (score >= 240) return { grade: 'B', label: 'Good', color: '#4CAF50' };
    if (score >= 200) return { grade: 'C', label: 'Average', color: COLORS.warning };
    if (score >= 160) return { grade: 'D', label: 'Below Average', color: '#FF7043' };
    return { grade: 'F', label: 'Poor', color: COLORS.error };
  };

  const gradeInfo = getGrade(totalScore);
  const wrongAnswers = answers.filter(
    (a) => !a.is_correct &&
    a.student_answer !== null &&
    a.student_answer !== 'NOT_ANSWERED'
  );
  const skippedAnswers = answers.filter(
    (a) => a.student_answer === null || a.student_answer === 'NOT_ANSWERED'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── SCORE HEADER ── */}
        <View style={[styles.header, { backgroundColor: gradeInfo.color }]}>
          <Text style={styles.gradeLabel}>{gradeInfo.label}</Text>
          <Text style={styles.totalScore}>{totalScore}</Text>
          <Text style={styles.outOf}>out of 400</Text>
          <Text style={styles.simulationLabel}>JAMB Simulation</Text>
        </View>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {answers.filter((a) => a.is_correct).length}
            </Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.error }]}>
              {wrongAnswers.length}
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

        {/* ── SUBJECT BREAKDOWN ── */}
        <Text style={styles.sectionTitle}>Score Breakdown</Text>

        {subjects.map((subject) => {
          const info = subjectScores[subject];
          const percentage = info ? (info.score / 100) * 100 : 0;
          return (
            <View key={subject} style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectName}>{subject}</Text>
                <Text style={styles.subjectScore}>
                  {info?.score || 0} / 100
                </Text>
              </View>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage}%` },
                    percentage >= 50
                      ? { backgroundColor: COLORS.success }
                      : { backgroundColor: COLORS.error },
                  ]}
                />
              </View>
              <Text style={styles.subjectDetail}>
                {info?.correct || 0} correct out of {info?.total || 0} questions
              </Text>
            </View>
          );
        })}

        {/* ── ADMISSION NOTE ── */}
        <View style={styles.admissionCard}>
          <Text style={styles.admissionTitle}>📊 What This Score Means</Text>
          {totalScore >= 280 ? (
            <Text style={styles.admissionText}>
              Your score of {totalScore} is excellent. You are likely to gain admission into competitive courses at top universities.
            </Text>
          ) : totalScore >= 200 ? (
            <Text style={styles.admissionText}>
              Your score of {totalScore} is average. You may qualify for admission depending on the institution and course. Keep practising to improve.
            </Text>
          ) : (
            <Text style={styles.admissionText}>
              Your score of {totalScore} needs improvement. Most institutions require a minimum of 200. Keep practising regularly using the subject practice mode.
            </Text>
          )}
        </View>

        {/* ── BUTTONS ── */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Dashboard', { student })}
          >
            <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Notebook', { student })}
          >
            <Text style={styles.secondaryButtonText}>📓 View Notebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Performance', { student })}
          >
            <Text style={styles.secondaryButtonText}>📊 View Performance</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SimulationResultsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: 30,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  gradeLabel: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalScore: {
    fontSize: 80,
    fontWeight: 'bold',
    color: COLORS.white,
    lineHeight: 90,
  },
  outOf: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  simulationLabel: {
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
    marginBottom: 20,
  },
  statBox: { alignItems: 'center' },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  subjectCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    flex: 1,
  },
  subjectScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBackground: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    height: 8,
    marginBottom: 8,
  },
  progressFill: {
    borderRadius: 10,
    height: 8,
  },
  subjectDetail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  admissionCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    borderRadius: 14,
    padding: 16,
  },
  admissionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  admissionText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  buttonGroup: { padding: 16, gap: 10 },
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