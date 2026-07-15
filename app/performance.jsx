import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/localCache';
import { getRank, RANKS } from '../utils/ranks';

const PerformanceScreen = ({ route, navigation }) => {
  const { student } = route.params;

  const [loading, setLoading] = useState(true);
  const [overallAverage, setOverallAverage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [subjectStats, setSubjectStats] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [strongestSubject, setStrongestSubject] = useState(null);
  const [weakestSubject, setWeakestSubject] = useState(null);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      const db = await getDb();

      const overall = db.getFirstSync(
        `SELECT
           COUNT(*) as total_sessions,
           AVG(score_percentage) as avg_score,
           SUM(total_questions) as total_questions
         FROM sessions
         WHERE student_id = ?`,
        [student.id]
      );

      setTotalSessions(overall?.total_sessions || 0);
      setOverallAverage(Math.round(overall?.avg_score || 0));
      setTotalQuestions(overall?.total_questions || 0);

      const bySubject = db.getAllSync(
        `SELECT
           subject,
           exam_body,
           COUNT(*) as attempts,
           AVG(score_percentage) as avg_score,
           MAX(score_percentage) as best_score,
           MIN(score_percentage) as worst_score,
           SUM(total_questions) as total_questions,
           SUM(correct_answers) as total_correct
         FROM sessions
         WHERE student_id = ? AND exam_body != 'JAMB_SIMULATION'
         GROUP BY subject, exam_body
         ORDER BY avg_score DESC`,
        [student.id]
      );

      setSubjectStats(bySubject);

      if (bySubject.length > 0) {
        setStrongestSubject(bySubject[0]);
        setWeakestSubject(bySubject[bySubject.length - 1]);
      }

      const recent = db.getAllSync(
        `SELECT * FROM sessions
         WHERE student_id = ?
         ORDER BY date_taken DESC
         LIMIT 10`,
        [student.id]
      );

      setRecentSessions(recent);

    } catch (error) {
      console.log('Performance load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return COLORS.success;
    if (score >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const getGrade = (score) => {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const getExamColor = (examBody) => {
    switch (examBody) {
      case 'JAMB': return '#1a1a2e';
      case 'WAEC': return '#2e7d32';
      case 'NECO': return '#e65100';
      case 'NABTEB': return '#6a1b9a';
      case 'JAMB_SIMULATION': return '#00695c';
      default: return COLORS.secondary;
    }
  };

  const currentRank = getRank(overallAverage);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 My Performance</Text>
          <Text style={styles.headerSubtitle}>
            {student.name} — {student.class_level}
          </Text>
        </View>

        {/* ── RANK CARD ── */}
        <View style={[styles.rankCard, { borderColor: currentRank.color }]}>
          <Text style={styles.rankIcon}>{currentRank.icon}</Text>
          <View style={styles.rankInfo}>
            <Text style={styles.rankLabel}>Current Rank</Text>
            <Text style={[styles.rankName, { color: currentRank.color }]}>
              {currentRank.name}
            </Text>
            <Text style={styles.rankRange}>
              Score range: {currentRank.minScore}% — {currentRank.maxScore}%
            </Text>
          </View>
          <Text style={[styles.rankPercent, { color: currentRank.color }]}>
            {overallAverage}%
          </Text>
        </View>

        {/* ── RANK PROGRESS BAR — shows all 5 ranks ── */}
        <View style={styles.rankProgressContainer}>
          <Text style={styles.rankProgressTitle}>Rank Progress</Text>
          <View style={styles.rankBarRow}>
            {RANKS.map((rank, index) => {
              const isCurrentRank = rank.name === currentRank.name;
              return (
                <View key={rank.name} style={styles.rankBarItem}>
                  <View style={[
                    styles.rankBarSegment,
                    { backgroundColor: rank.color },
                    isCurrentRank && styles.rankBarSegmentActive,
                  ]}>
                    <Text style={styles.rankBarIcon}>{rank.icon}</Text>
                  </View>
                  <Text style={[
                    styles.rankBarLabel,
                    isCurrentRank && { color: rank.color, fontWeight: 'bold' },
                  ]}>
                    {rank.name}
                  </Text>
                  {isCurrentRank && (
                    <Text style={styles.youAreHere}>▲ You</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Show what they need to reach next rank */}
          {currentRank.name !== 'Guru' && (
            <Text style={styles.nextRankHint}>
              {(() => {
                const currentIndex = RANKS.findIndex(
                  (r) => r.name === currentRank.name
                );
                const nextRank = RANKS[currentIndex + 1];
                const needed = nextRank.minScore - overallAverage;
                return `You need ${needed}% more to reach ${nextRank.icon} ${nextRank.name}`;
              })()}
            </Text>
          )}

          {currentRank.name === 'Guru' && (
            <Text style={styles.nextRankHint}>
              🏆 You have reached the highest rank. Congratulations!
            </Text>
          )}
        </View>

        {/* ── OVERALL STATS ── */}
        <View style={styles.overallCard}>
          <View style={styles.overallScoreCircle}>
            <Text style={styles.overallScoreNumber}>{overallAverage}%</Text>
            <Text style={styles.overallScoreLabel}>Overall Average</Text>
          </View>

          <View style={styles.overallStatsRow}>
            <View style={styles.overallStatItem}>
              <Text style={styles.overallStatNumber}>{totalSessions}</Text>
              <Text style={styles.overallStatLabel}>Tests Taken</Text>
            </View>
            <View style={styles.overallStatDivider} />
            <View style={styles.overallStatItem}>
              <Text style={styles.overallStatNumber}>{totalQuestions}</Text>
              <Text style={styles.overallStatLabel}>Questions Attempted</Text>
            </View>
            <View style={styles.overallStatDivider} />
            <View style={styles.overallStatItem}>
              <Text style={styles.overallStatNumber}>
                {subjectStats.length}
              </Text>
              <Text style={styles.overallStatLabel}>Subjects Covered</Text>
            </View>
          </View>
        </View>

        {/* ── STRENGTH AND WEAKNESS ── */}
        {strongestSubject && weakestSubject && (
          <View style={styles.strengthRow}>
            <View style={[styles.strengthCard, { borderLeftColor: COLORS.success }]}>
              <Text style={styles.strengthIcon}>💪</Text>
              <Text style={styles.strengthLabel}>Strongest</Text>
              <Text style={styles.strengthSubject}>
                {strongestSubject.subject}
              </Text>
              <Text style={[styles.strengthScore, { color: COLORS.success }]}>
                {Math.round(strongestSubject.avg_score)}%
              </Text>
            </View>

            <View style={[styles.strengthCard, { borderLeftColor: COLORS.error }]}>
              <Text style={styles.strengthIcon}>📚</Text>
              <Text style={styles.strengthLabel}>Needs Work</Text>
              <Text style={styles.strengthSubject}>
                {weakestSubject.subject}
              </Text>
              <Text style={[styles.strengthScore, { color: COLORS.error }]}>
                {Math.round(weakestSubject.avg_score)}%
              </Text>
            </View>
          </View>
        )}

        {/* ── SUBJECT BREAKDOWN ── */}
        {subjectStats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No performance data yet</Text>
            <Text style={styles.emptySubText}>
              Take some quizzes first and your performance will appear here.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.startButtonText}>Start Practising</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Subject Breakdown</Text>

            {subjectStats.map((stat, index) => {
              const avg = Math.round(stat.avg_score);
              const best = Math.round(stat.best_score);
              const scoreColor = getScoreColor(avg);
              const grade = getGrade(avg);

              return (
                <View key={index} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectLeft}>
                      <View style={[
                        styles.gradeBadge,
                        { backgroundColor: scoreColor }
                      ]}>
                        <Text style={styles.gradeText}>{grade}</Text>
                      </View>
                      <View>
                        <Text style={styles.subjectName}>{stat.subject}</Text>
                        <View style={[
                          styles.examBodyTag,
                          { backgroundColor: getExamColor(stat.exam_body) }
                        ]}>
                          <Text style={styles.examBodyTagText}>
                            {stat.exam_body}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.avgScore, { color: scoreColor }]}>
                      {avg}%
                    </Text>
                  </View>

                  <View style={styles.progressBackground}>
                    <View style={[
                      styles.progressFill,
                      { width: `${avg}%`, backgroundColor: scoreColor }
                    ]} />
                  </View>

                  <View style={styles.subjectDetailRow}>
                    <Text style={styles.subjectDetailText}>
                      🔢 {stat.attempts} attempt{stat.attempts !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.subjectDetailText}>
                      ✅ Best: {best}%
                    </Text>
                    <Text style={styles.subjectDetailText}>
                      📋 {stat.total_correct}/{stat.total_questions} correct
                    </Text>
                  </View>
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>Recent Sessions</Text>

            {recentSessions.map((session, index) => {
              const score = Math.round(session.score_percentage);
              const scoreColor = getScoreColor(score);
              const date = session.date_taken?.slice(0, 10);

              return (
                <View key={index} style={styles.sessionCard}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionSubject}>
                      {session.subject}
                    </Text>
                    <Text style={styles.sessionDetail}>
                      {session.exam_body === 'JAMB_SIMULATION'
                        ? 'JAMB Simulation'
                        : session.exam_body}{' '}
                      — {date}
                    </Text>
                    <Text style={styles.sessionDetail}>
                      {session.correct_answers}/{session.total_questions} correct
                    </Text>
                  </View>
                  <View style={[
                    styles.sessionScoreBadge,
                    { backgroundColor: scoreColor }
                  ]}>
                    <Text style={styles.sessionScoreText}>{score}%</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerformanceScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 30,
  },
  loadingText: { marginTop: 12, color: COLORS.textLight, fontSize: 14 },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  backButton: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },

  // Rank card
  rankCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 2,
    gap: 14,
  },
  rankIcon: { fontSize: 40 },
  rankInfo: { flex: 1 },
  rankLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rankName: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  rankRange: { fontSize: 11, color: COLORS.textLight },
  rankPercent: { fontSize: 28, fontWeight: 'bold' },

  // Rank progress bar
  rankProgressContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
  },
  rankProgressTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rankBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  rankBarItem: {
    alignItems: 'center',
    flex: 1,
  },
  rankBarSegment: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
    marginBottom: 6,
  },
  rankBarSegmentActive: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
    elevation: 4,
  },
  rankBarIcon: { fontSize: 20 },
  rankBarLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  youAreHere: {
    fontSize: 9,
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  nextRankHint: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  // Overall card
  overallCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  overallScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.secondary,
  },
  overallScoreNumber: { fontSize: 30, fontWeight: 'bold', color: COLORS.white },
  overallScoreLabel: { fontSize: 10, color: COLORS.textLight, textAlign: 'center' },
  overallStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  overallStatItem: { alignItems: 'center', flex: 1 },
  overallStatNumber: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  overallStatLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  overallStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    height: 40,
    alignSelf: 'center',
  },

  // Strength cards
  strengthRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  strengthCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 1,
  },
  strengthIcon: { fontSize: 24, marginBottom: 6 },
  strengthLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  strengthSubject: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  strengthScore: { fontSize: 20, fontWeight: 'bold' },

  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Subject card
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
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  subjectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  examBodyTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  examBodyTagText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  avgScore: { fontSize: 24, fontWeight: 'bold' },
  progressBackground: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    height: 8,
    marginBottom: 12,
  },
  progressFill: { borderRadius: 10, height: 8 },
  subjectDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  subjectDetailText: { fontSize: 11, color: COLORS.textLight },

  // Session card
  sessionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  sessionLeft: { flex: 1 },
  sessionSubject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  sessionDetail: { fontSize: 11, color: COLORS.textLight, marginBottom: 2 },
  sessionScoreBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  sessionScoreText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },

  // Empty state
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});