// This is the real Dashboard Screen.
// It is the main menu of the app.
// The student sees this every time they open the app after onboarding.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/db';

// These are the exam bodies the student can choose from
const EXAM_BODIES = [
  { id: 'JAMB', label: 'JAMB', icon: '📘', color: '#1a1a2e' },
  { id: 'WAEC', label: 'WAEC', icon: '📗', color: '#2e7d32' },
  { id: 'NECO', label: 'NECO', icon: '📙', color: '#e65100' },
  { id: 'NABTEB', label: 'NABTEB', icon: '📕', color: '#6a1b9a' },
  { id: 'POST_UTME', label: 'Post UTME', icon: '🏫', color: '#c62828' },
  { id: 'JAMB_SIM', label: 'JAMB Simulation', icon: '🎯', color: '#00695c' },
];

export default function DashboardScreen({ route, navigation }) {
  const { student } = route.params;
  const [recentSessions, setRecentSessions] = useState([]);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [averageScore, setAverageScore] = useState(0);

  useEffect(() => {
    loadStudentStats();
  }, []);

  // Load the student's recent performance from the database
  const loadStudentStats = async () => {
    try {
      const db = getDb();

      // Get the last 3 sessions this student did
      const sessions = await db.getAllAsync(
        `SELECT * FROM sessions 
         WHERE student_id = ? 
         ORDER BY date_taken DESC 
         LIMIT 3`,
        [student.id]
      );
      setRecentSessions(sessions);

      // Get total number of sessions
      const totalResult = await db.getFirstAsync(
        `SELECT COUNT(*) as total FROM sessions WHERE student_id = ?`,
        [student.id]
      );
      setTotalAttempted(totalResult?.total || 0);

      // Get average score across all sessions
      const avgResult = await db.getFirstAsync(
        `SELECT AVG(score_percentage) as avg FROM sessions WHERE student_id = ?`,
        [student.id]
      );
      setAverageScore(Math.round(avgResult?.avg || 0));

    } catch (error) {
      console.log('Dashboard stats error:', error);
    }
  };

  // When student taps an exam body
const handleExamSelect = (exam) => {
    if (exam.id === 'JAMB_SIM') {
      navigation.navigate('JambSimulation', { student });
    } else if (exam.id === 'POST_UTME') {
      navigation.navigate('InstitutionSelect', { student });
    } else {
      navigation.navigate('SubjectSelect', {
        student,
        examBody: exam.id,
        institution: null,
      });
    }
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── TOP HEADER ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.studentName}>{student.name} 👋</Text>
            <Text style={styles.classLabel}>{student.class_level}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => navigation.navigate('Performance', { student })}
          >
            <Text style={styles.profileIconText}>📊</Text>
          </TouchableOpacity>
        </View>

        {/* ── QUICK STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalAttempted}</Text>
            <Text style={styles.statLabel}>Tests Taken</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{averageScore}%</Text>
            <Text style={styles.statLabel}>Average Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {recentSessions.length > 0
                ? Math.round(recentSessions[0].score_percentage) + '%'
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Last Score</Text>
          </View>
        </View>

        {/* ── CHOOSE EXAM SECTION ── */}
        <Text style={styles.sectionTitle}>Choose Exam Body</Text>
        <Text style={styles.sectionSubtitle}>
          Select the exam you want to practise for
        </Text>

        <View style={styles.examGrid}>
          {EXAM_BODIES.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={[styles.examCard, { backgroundColor: exam.color }]}
              onPress={() => handleExamSelect(exam)}
            >
              <Text style={styles.examIcon}>{exam.icon}</Text>
              <Text style={styles.examLabel}>{exam.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── RECENT ACTIVITY SECTION ── */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {recentSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>
              You have not taken any test yet.
            </Text>
            <Text style={styles.emptySubText}>
              Choose an exam body above to start practising.
            </Text>
          </View>
        ) : (
          recentSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View>
                <Text style={styles.sessionSubject}>{session.subject}</Text>
                <Text style={styles.sessionExam}>
                  {session.exam_body} — {session.date_taken?.slice(0, 10)}
                </Text>
              </View>
              <View style={styles.sessionScore}>
                <Text style={styles.sessionScoreText}>
                  {Math.round(session.score_percentage)}%
                </Text>
              </View>
            </View>
          ))
        )}

        {/* ── BOTTOM NAVIGATION BUTTONS ── */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Performance', { student })}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text style={styles.navLabel}>Performance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Notebook', { student })}
          >
            <Text style={styles.navIcon}>📓</Text>
            <Text style={styles.navLabel}>Notebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Settings', { student })}
          >
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={styles.navLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 2,
  },
  classLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
    fontWeight: '600',
  },
  profileIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 22,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  examGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  examCard: {
    width: '45%',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: '2%',
    marginBottom: 4,
  },
  examIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  examLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6,
  },
  sessionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  sessionSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  sessionExam: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
  },
  sessionScore: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  sessionScoreText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-around',
    elevation: 2,
  },
  navButton: {
    alignItems: 'center',
    padding: 8,
  },
  navIcon: {
    fontSize: 24,
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.textDark,
    marginTop: 4,
    fontWeight: '600',
  },
});