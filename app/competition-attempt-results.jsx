import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/colors';

export default function CompetitionAttemptResultsScreen({ route, navigation }) {
  const {
    tierNumber,
    totalPoints,
    correctCount,
    missedCount,
    wrongCount,
    totalQuestions,
    outcome,
    newTier,
  } = route.params;

  const getOutcomeMessage = () => {
    if (outcome === 'promoted') {
      return newTier === tierNumber
        ? `🏆 Outstanding! You've held your position as a top performer at Tier 1.`
        : `🎉 Promoted! You've moved up to Tier ${newTier}.`;
    }
    if (outcome === 'survived') {
      return `You stayed at Tier ${tierNumber}. Fresh 3 attempts have been given to you.`;
    }
    if (outcome === 'demoted') {
      return `You've been moved down to Tier ${newTier}. You get a fresh 3 attempts there — keep pushing!`;
    }
    return `Attempt recorded. You have attempts remaining at Tier ${tierNumber}.`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Tier {tierNumber} Attempt Complete</Text>
        <Text style={styles.totalScore}>{totalPoints}</Text>
        <Text style={styles.outOf}>out of 400</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{correctCount}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: COLORS.error }]}>{wrongCount}</Text>
          <Text style={styles.statLabel}>Wrong</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{missedCount}</Text>
          <Text style={styles.statLabel}>Missed (Timed Out)</Text>
        </View>
      </View>

      <Text style={styles.note}>{getOutcomeMessage()}</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.popToTop()}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: 30, paddingTop: 60, alignItems: 'center' },
  headerLabel: { fontSize: 16, color: COLORS.textLight, marginBottom: 8 },
  totalScore: { fontSize: 64, fontWeight: 'bold', color: COLORS.white },
  outOf: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    elevation: 4,
    padding: 16,
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.success },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
  note: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
    marginBottom: 30,
  },
  button: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});