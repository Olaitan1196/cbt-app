import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb, downloadAndCacheQuestions } from '../database/localCache';
import { getActiveSeason, getParticipant } from '../services/competitionService';
import {
  getTierInfo,
  getOrCreateTierProgress,
  startAttempt,
} from '../services/competitionAttemptService';

const ENGLISH = 'English Language';

export default function CompetitionAttemptScreen({ route, navigation }) {
  const { student } = route.params;

  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [season, setSeason] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [tierInfo, setTierInfo] = useState(null);
  const [tierProgress, setTierProgress] = useState(null);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const activeSeason = await getActiveSeason();
      if (!activeSeason) {
        setErrorMessage('There is no active competition right now.');
        setLoading(false);
        return;
      }

      const activeParticipant = await getParticipant(activeSeason.id, student.id);
      if (!activeParticipant) {
        setErrorMessage('You are not registered for this competition yet.');
        setLoading(false);
        return;
      }

      const tier = await getTierInfo(activeSeason.id, activeParticipant.current_tier);
      const progress = await getOrCreateTierProgress(
        activeParticipant.id,
        activeParticipant.current_tier
      );

      setSeason(activeSeason);
      setParticipant(activeParticipant);
      setTierInfo(tier);
      setTierProgress(progress);
      setLoading(false);
    } catch (error) {
      setErrorMessage('Could not load competition information. Please try again.');
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (tierProgress.attempts_remaining <= 0) {
      Alert.alert(
        'No Attempts Left',
        'You have used all 3 attempts at this tier. Please check back later.'
      );
      return;
    }

    setPreparing(true);

    try {
      const subjects = [
        ENGLISH,
        participant.subject_2,
        participant.subject_3,
        participant.subject_4,
      ];

      // Make sure every subject's questions are on the phone before we begin.
      for (const subject of subjects) {
        await downloadAndCacheQuestions('JAMB', subject);
      }

      const db = await getDb();
      let allQuestions = [];

      for (const subject of subjects) {
        const limit = subject === ENGLISH ? 60 : 40;
        const questions = db.getAllSync(
          `SELECT * FROM questions
           WHERE exam_body = 'JAMB' AND subject = ?
           ORDER BY RANDOM() LIMIT ?`,
          [subject, limit]
        );

        const tagged = questions.map((q) => ({
          ...q,
          competition_subject: subject,
          points_per_question: subject === ENGLISH ? 1.67 : 2.5,
        }));

        allQuestions = [...allQuestions, ...tagged];
      }

      if (allQuestions.length === 0) {
        setPreparing(false);
        Alert.alert('No Questions Available', 'Could not find questions for your subjects. Please try again later.');
        return;
      }

      const attempt = await startAttempt(participant.id, participant.current_tier);

      setPreparing(false);

      navigation.replace('CompetitionQuiz', {
        student,
        participant,
        tierNumber: participant.current_tier,
        attemptId: attempt.id,
        allQuestions,
        secondsPerQuestion: season.seconds_per_question,
      });
    } catch (error) {
      setPreparing(false);
      Alert.alert('Could Not Start', 'Something went wrong preparing your attempt. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerScreen}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.backButtonFull} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonFullText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centerScreen}>
        <Text style={styles.tierTitle}>Tier {participant.current_tier}</Text>
        <Text style={styles.attemptsText}>
          {tierProgress.attempts_remaining} of 3 attempts remaining
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoRow}>Promotion Score: {tierInfo?.promotion_points} / 400</Text>
          <Text style={styles.infoRow}>Survival Score: {tierInfo?.survival_points} / 400</Text>
          <Text style={styles.infoRow}>{season.seconds_per_question} seconds per question</Text>
          <Text style={styles.infoRow}>180 questions total</Text>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          disabled={preparing || tierProgress.attempts_remaining <= 0}
        >
          {preparing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.startButtonText}>Start Attempt</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyText: { fontSize: 15, color: COLORS.textDark, textAlign: 'center', marginBottom: 20 },
  tierTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark },
  attemptsText: { fontSize: 14, color: COLORS.textLight, marginTop: 6, marginBottom: 20 },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginBottom: 24,
    elevation: 1,
  },
  infoRow: { fontSize: 13, color: COLORS.textDark, marginBottom: 8 },
  startButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  backButtonFull: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  backButtonFullText: { color: COLORS.white, fontWeight: 'bold' },
  backLink: { marginTop: 16 },
  backLinkText: { color: COLORS.textLight, fontSize: 13 },
});