import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/localCache';
import { getRank } from '../utils/ranks';
import { getCurrentProfileWithDeviceCheck } from '../services/authService';
import { fetchActiveBroadcasts } from '../services/broadcastService';
import { getUnseenBroadcast, markBroadcastSeen } from '../database/localCache';

const EXAM_BODIES = [
  { id: 'JAMB', label: 'JAMB', icon: '📘', color: '#1a1a2e' },
  { id: 'WAEC', label: 'WAEC', icon: '📗', color: '#2e7d32' },
  { id: 'NECO', label: 'NECO', icon: '📙', color: '#e65100' },
  { id: 'NABTEB', label: 'NABTEB', icon: '📕', color: '#6a1b9a' },
  { id: 'POST_UTME', label: 'Post UTME', icon: '🏫', color: '#c62828' },
  { id: 'JAMB_SIM', label: 'JAMB Simulation', icon: '🎯', color: '#00695c' },
];

const DashboardScreen = ({ route, navigation }) => {
  // ════════════════════════════════════════════════
  // IDENTITY NOW COMES FROM SUPABASE, NOT LOCAL DATA
  // "profile" is the true source of truth. "student"
  // below is a bridge object shaped the OLD way, so
  // screens we haven't rewritten yet (Notebook,
  // Performance, Settings, etc.) keep working unchanged.
  // ════════════════════════════════════════════════
  const [profile, setProfile] = useState(route.params?.profile || null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const student = profile
    ? {
        id: profile.id,
        name: profile.full_name,
        class_level: profile.class_level,
        is_paid: profile.is_paid,
        trial_start_date: profile.trial_start_date,
      }
    : null;

  const [recentSessions, setRecentSessions] = useState([]);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [currentRank, setCurrentRank] = useState(null);

  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const welcomeOpacity = useState(new Animated.Value(0))[0];
  const [activeBroadcast, setActiveBroadcast] = useState(null);
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);

  useEffect(() => {
    verifyAccessThenLoad();
  }, []);

  const verifyAccessThenLoad = async () => {
    try {
      // Always re-check with Supabase directly, even if we already
      // got a profile passed in from Splash. This also protects
      // against a different device having claimed this account
      // since this phone was last active.
      const { profile: freshProfile, kickedOut } = await getCurrentProfileWithDeviceCheck();

      if (kickedOut) {
        navigation.replace('Login', { kickedOut: true });
        return;
      }

      if (!freshProfile) {
        navigation.replace('Login');
        return;
      }

      setProfile(freshProfile);

      if (!freshProfile.is_paid) {
        const startDate = new Date(freshProfile.trial_start_date);
        const today = new Date();
        const diffDays = Math.floor(
          (today - startDate) / (1000 * 60 * 60 * 24)
        );

        if (diffDays > 3) {
          navigation.replace('TrialExpired', { profile: freshProfile });
          return;
        }
      }

      setCheckingAccess(false);
      loadStudentStats(freshProfile);
      checkForBroadcasts();
    } catch (error) {
      console.log('Dashboard access check error:', error);
      navigation.replace('Login');
    }
  };

  const checkForBroadcasts = async () => {
    try {
      const active = await fetchActiveBroadcasts();
      const unseen = await getUnseenBroadcast(active);

      if (unseen) {
        setActiveBroadcast(unseen);
        setBroadcastModalVisible(true);
      }
    } catch (error) {
      console.log('Broadcast check error:', error);
    }
  };

  const handleDismissBroadcast = async () => {
    if (activeBroadcast) {
      await markBroadcastSeen(activeBroadcast.id);
    }
    setBroadcastModalVisible(false);
    setActiveBroadcast(null);
  };

  const loadStudentStats = async (activeProfile) => {
    try {
      const db = await getDb();

      // Local quiz history is now linked using the Supabase
      // profile id instead of an old local student id.
      const sessions = db.getAllSync(
        `SELECT * FROM sessions
         WHERE student_id = ?
         ORDER BY date_taken DESC
         LIMIT 3`,
        [activeProfile.id]
      );
      setRecentSessions(sessions);

      const totalResult = db.getFirstSync(
        `SELECT COUNT(*) as total FROM sessions WHERE student_id = ?`,
        [activeProfile.id]
      );
      setTotalAttempted(totalResult?.total || 0);

      const avgResult = db.getFirstSync(
        `SELECT AVG(score_percentage) as avg FROM sessions WHERE student_id = ?`,
        [activeProfile.id]
      );

      const avg = Math.round(avgResult?.avg || 0);
      setAverageScore(avg);

      const rank = getRank(avg);
      setCurrentRank(rank);

      if (rank.message) {
        const message = rank.message(activeProfile.full_name);
        setWelcomeMessage(message);
        setShowWelcome(true);
        showWelcomeAnimation();
      }
    } catch (error) {
      console.log('Dashboard stats error:', error);
    }
  };

  const showWelcomeAnimation = () => {
    Animated.sequence([
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3500),
      Animated.timing(welcomeOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowWelcome(false);
    });
  };

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (checkingAccess) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerLoading]}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      {showWelcome && (
        <Animated.View style={[
          styles.welcomeBanner,
          {
            opacity: welcomeOpacity,
            backgroundColor: currentRank?.color || COLORS.secondary,
          }
        ]}>
          <Text style={styles.welcomeBannerIcon}>{currentRank?.icon}</Text>
          <Text style={styles.welcomeBannerText}>{welcomeMessage}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.studentName}>{student?.name} 👋</Text>
            <Text style={styles.classLabel}>{student?.class_level}</Text>
          </View>

          {currentRank && (
            <TouchableOpacity
              style={[styles.rankBadge, { borderColor: currentRank.color }]}
              onPress={() => navigation.navigate('Performance', { student })}
            >
              <Text style={styles.rankBadgeIcon}>{currentRank.icon}</Text>
              <Text style={[styles.rankBadgeName, { color: currentRank.color }]}>
                {currentRank.name}
              </Text>
              <Text style={styles.rankBadgeScore}>{averageScore}%</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <TouchableOpacity
          style={styles.geniusCompetitionCard}
          onPress={() => navigation.navigate('GeniusCompetition', { student })}
        >
          <Text style={styles.geniusCompetitionIcon}>🏆</Text>
          <View style={styles.geniusCompetitionTextGroup}>
            <Text style={styles.geniusCompetitionTitle}>Genius Competition</Text>
            <Text style={styles.geniusCompetitionSubtitle}>
              Climb the tiers. Compete with students nationwide.
            </Text>
          </View>
          <Text style={styles.geniusCompetitionArrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Choose Exam Body</Text>
        <Text style={styles.sectionSubtitle}>
          Select the exam you want to practise for
        </Text>

        <View style={styles.examGrid}>
          {EXAM_BODIES.map((exam, index) => (
            <TouchableOpacity
              key={exam.id}
              style={[
                styles.examCard,
                { backgroundColor: exam.color },
                EXAM_BODIES.length % 2 !== 0 &&
                  index === EXAM_BODIES.length - 1 &&
                  styles.examCardFull,
              ]}
              onPress={() => handleExamSelect(exam)}
            >
              <Text style={styles.examIcon}>{exam.icon}</Text>
              <Text style={styles.examLabel}>{exam.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
                  {session.exam_body === 'JAMB_SIMULATION'
                    ? 'JAMB Simulation'
                    : session.exam_body}{' '}
                  — {session.date_taken?.slice(0, 10)}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    <Modal
        visible={broadcastModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDismissBroadcast}
      >
        <View style={styles.broadcastOverlay}>
          <View style={styles.broadcastBox}>
            <Text style={styles.broadcastIcon}>📢</Text>
            <Text style={styles.broadcastTitle}>{activeBroadcast?.title}</Text>
            <Text style={styles.broadcastBody}>{activeBroadcast?.body}</Text>

            <TouchableOpacity
              style={styles.broadcastButton}
              onPress={handleDismissBroadcast}
            >
              <Text style={styles.broadcastButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  geniusCompetitionCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  geniusCompetitionIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  geniusCompetitionTextGroup: {
    flex: 1,
  },
  geniusCompetitionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  geniusCompetitionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
  },
  geniusCompetitionArrow: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.6)',
  },
  centerLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  welcomeBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  welcomeBannerIcon: { fontSize: 30 },
  welcomeBannerText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 14, color: COLORS.textLight },
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
  rankBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 2,
    minWidth: 70,
  },
  rankBadgeIcon: { fontSize: 22, marginBottom: 2 },
  rankBadgeName: { fontSize: 11, fontWeight: 'bold' },
  rankBadgeScore: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
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
  statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
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
    paddingHorizontal: 16,
    gap: 12,
  },
  examCard: {
    width: '47%',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  examCardFull: { width: '100%' },
  examIcon: { fontSize: 32, marginBottom: 8 },
  examLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },
  emptyCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
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
  sessionExam: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
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
  navButton: { alignItems: 'center', padding: 8 },
  navIcon: { fontSize: 24 },
  navLabel: {
    fontSize: 11,
    color: COLORS.textDark,
    marginTop: 4,
    fontWeight: '600',
  },
  broadcastOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  broadcastBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 26,
    width: '100%',
    alignItems: 'center',
  },
  broadcastIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  broadcastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  broadcastBody: {
    fontSize: 14,
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  broadcastButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  broadcastButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
});