import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/db';

const QUESTION_COUNTS = [10, 20, 30, 50, 100];

// Timer options in minutes
const TIMER_OPTIONS = [15, 20, 30, 45, 60, 90];

const TopicFilterScreen = ({ route, navigation }) => {
  const { student, examBody, institution, subject } = route.params;
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal visibility
  const [modalVisible, setModalVisible] = useState(false);

  // What the student selected
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [availableYears, setAvailableYears] = useState([]);

  // Student choices inside modal
  const [selectedCount, setSelectedCount] = useState(null);
  const [selectedTimer, setSelectedTimer] = useState(null);
  const [yearMode, setYearMode] = useState('all');
  // yearMode = 'all' means all years, 'range' means pick start and end year
  const [yearFrom, setYearFrom] = useState(null);
  const [yearTo, setYearTo] = useState(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = () => {
    try {
      const db = getDb();
      let results = [];

      if (examBody === 'POST_UTME' && institution) {
        results = db.getAllSync(
          `SELECT DISTINCT topic FROM questions
           WHERE exam_body = ? AND subject = ? AND institution_id = ?
           AND topic IS NOT NULL AND topic != ''
           ORDER BY topic ASC`,
          [examBody, subject, institution.id]
        );
      } else {
        results = db.getAllSync(
          `SELECT DISTINCT topic FROM questions
           WHERE exam_body = ? AND subject = ?
           AND topic IS NOT NULL AND topic != ''
           ORDER BY topic ASC`,
          [examBody, subject]
        );
      }

      setTopics(results.map((t) => t.topic));
    } catch (error) {
      console.log('Topic load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all distinct years available for this selection
  const getAvailableYears = (topic) => {
    try {
      const db = getDb();
      let results = [];

      if (topic === null) {
        if (examBody === 'POST_UTME' && institution) {
          results = db.getAllSync(
            `SELECT DISTINCT year FROM questions
             WHERE exam_body = ? AND subject = ? AND institution_id = ?
             ORDER BY year ASC`,
            [examBody, subject, institution.id]
          );
        } else {
          results = db.getAllSync(
            `SELECT DISTINCT year FROM questions
             WHERE exam_body = ? AND subject = ?
             ORDER BY year ASC`,
            [examBody, subject]
          );
        }
      } else {
        if (examBody === 'POST_UTME' && institution) {
          results = db.getAllSync(
            `SELECT DISTINCT year FROM questions
             WHERE exam_body = ? AND subject = ? AND topic = ? AND institution_id = ?
             ORDER BY year ASC`,
            [examBody, subject, topic, institution.id]
          );
        } else {
          results = db.getAllSync(
            `SELECT DISTINCT year FROM questions
             WHERE exam_body = ? AND subject = ? AND topic = ?
             ORDER BY year ASC`,
            [examBody, subject, topic]
          );
        }
      }

      return results.map((r) => r.year);
    } catch (error) {
      return [];
    }
  };

  const getAvailableCount = (topic) => {
    try {
      const db = getDb();
      let result;

      if (topic === null) {
        if (examBody === 'POST_UTME' && institution) {
          result = db.getFirstSync(
            `SELECT COUNT(*) as count FROM questions
             WHERE exam_body = ? AND subject = ? AND institution_id = ?`,
            [examBody, subject, institution.id]
          );
        } else {
          result = db.getFirstSync(
            `SELECT COUNT(*) as count FROM questions
             WHERE exam_body = ? AND subject = ?`,
            [examBody, subject]
          );
        }
      } else {
        if (examBody === 'POST_UTME' && institution) {
          result = db.getFirstSync(
            `SELECT COUNT(*) as count FROM questions
             WHERE exam_body = ? AND subject = ? AND topic = ? AND institution_id = ?`,
            [examBody, subject, topic, institution.id]
          );
        } else {
          result = db.getFirstSync(
            `SELECT COUNT(*) as count FROM questions
             WHERE exam_body = ? AND subject = ? AND topic = ?`,
            [examBody, subject, topic]
          );
        }
      }

      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  };

  const handleTopicTap = (topic) => {
    const count = getAvailableCount(topic);
    const years = getAvailableYears(topic);

    setSelectedTopic(topic);
    setAvailableCount(count);
    setAvailableYears(years);

    // Reset all choices
    setSelectedCount(null);
    setSelectedTimer(null);
    setYearMode('all');
    setYearFrom(years[0] || null);
    setYearTo(years[years.length - 1] || null);

    setModalVisible(true);
  };

  const handleStartQuiz = () => {
    if (!selectedCount) {
      alert('Please select the number of questions');
      return;
    }
    if (!selectedTimer) {
      alert('Please select a time limit');
      return;
    }

    setModalVisible(false);

    navigation.navigate('Quiz', {
      student,
      examBody,
      institution,
      subject,
      topic: selectedTopic,
      questionCount: selectedCount,
      timerMinutes: selectedTimer,
      yearFrom: yearMode === 'range' ? yearFrom : null,
      yearTo: yearMode === 'range' ? yearTo : null,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subject}</Text>
        <Text style={styles.headerSubtitle}>{examBody}</Text>
      </View>

      <TouchableOpacity
        style={styles.allTopicsButton}
        onPress={() => handleTopicTap(null)}
      >
        <View style={styles.allTopicsLeft}>
          <Text style={styles.allTopicsIcon}>🎯</Text>
          <View>
            <Text style={styles.allTopicsTitle}>All Topics</Text>
            <Text style={styles.allTopicsSubtitle}>
              Practice questions from every topic
            </Text>
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or choose a specific topic</Text>
        <View style={styles.dividerLine} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading topics...</Text>
        </View>
      ) : topics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyText}>No specific topics found</Text>
          <Text style={styles.emptySubText}>
            Use the All Topics button above to start practising
          </Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.topicCard}
              onPress={() => handleTopicTap(item)}
            >
              <Text style={styles.topicBullet}>📌</Text>
              <Text style={styles.topicName}>{item}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── SETTINGS MODAL ── */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Modal Title */}
              <Text style={styles.modalTitle}>Quiz Settings</Text>
              <Text style={styles.modalSubtitle}>
                {selectedTopic === null ? 'All Topics' : selectedTopic}
              </Text>

              <View style={styles.availableRow}>
                <Text style={styles.availableText}>
                  📊 {availableCount} questions available
                </Text>
              </View>

              {/* ── NUMBER OF QUESTIONS ── */}
              <Text style={styles.sectionLabel}>Number of Questions</Text>
              <View style={styles.countGrid}>
                {QUESTION_COUNTS.map((count) => {
                  const isDisabled = availableCount < count;
                  return (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.choiceButton,
                        selectedCount === count && styles.choiceButtonActive,
                        isDisabled && styles.choiceButtonDisabled,
                      ]}
                      onPress={() => !isDisabled && setSelectedCount(count)}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.choiceButtonText,
                        selectedCount === count && styles.choiceButtonTextActive,
                        isDisabled && styles.choiceButtonTextDisabled,
                      ]}>
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {/* All available */}
                <TouchableOpacity
                  style={[
                    styles.choiceButton,
                    selectedCount === availableCount && styles.choiceButtonActive,
                  ]}
                  onPress={() => setSelectedCount(availableCount)}
                >
                  <Text style={[
                    styles.choiceButtonText,
                    selectedCount === availableCount && styles.choiceButtonTextActive,
                  ]}>
                    All ({availableCount})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── TIMER SETTING ── */}
              <Text style={styles.sectionLabel}>Time Limit (minutes)</Text>
              <View style={styles.countGrid}>
                {TIMER_OPTIONS.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.choiceButton,
                      selectedTimer === mins && styles.choiceButtonActive,
                    ]}
                    onPress={() => setSelectedTimer(mins)}
                  >
                    <Text style={[
                      styles.choiceButtonText,
                      selectedTimer === mins && styles.choiceButtonTextActive,
                    ]}>
                      {mins}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── YEAR SELECTION ── */}
              <Text style={styles.sectionLabel}>Year Range</Text>
              <View style={styles.yearModeRow}>
                <TouchableOpacity
                  style={[
                    styles.yearModeButton,
                    yearMode === 'all' && styles.yearModeButtonActive,
                  ]}
                  onPress={() => setYearMode('all')}
                >
                  <Text style={[
                    styles.yearModeText,
                    yearMode === 'all' && styles.yearModeTextActive,
                  ]}>
                    All Years
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.yearModeButton,
                    yearMode === 'range' && styles.yearModeButtonActive,
                  ]}
                  onPress={() => setYearMode('range')}
                >
                  <Text style={[
                    styles.yearModeText,
                    yearMode === 'range' && styles.yearModeTextActive,
                  ]}>
                    Select Range
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Show year pickers only if range mode is selected */}
              {yearMode === 'range' && availableYears.length > 0 && (
                <View style={styles.yearPickerContainer}>

                  {/* FROM year */}
                  <Text style={styles.yearPickerLabel}>From Year</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.yearScroll}
                  >
                    {availableYears.map((year) => (
                      <TouchableOpacity
                        key={`from-${year}`}
                        style={[
                          styles.yearChip,
                          yearFrom === year && styles.yearChipActive,
                        ]}
                        onPress={() => {
                          setYearFrom(year);
                          if (yearTo && year > yearTo) setYearTo(year);
                        }}
                      >
                        <Text style={[
                          styles.yearChipText,
                          yearFrom === year && styles.yearChipTextActive,
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* TO year */}
                  <Text style={styles.yearPickerLabel}>To Year</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.yearScroll}
                  >
                    {availableYears
                      .filter((y) => y >= (yearFrom || 0))
                      .map((year) => (
                        <TouchableOpacity
                          key={`to-${year}`}
                          style={[
                            styles.yearChip,
                            yearTo === year && styles.yearChipActive,
                          ]}
                          onPress={() => setYearTo(year)}
                        >
                          <Text style={[
                            styles.yearChipText,
                            yearTo === year && styles.yearChipTextActive,
                          ]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>

                  {yearFrom && yearTo && (
                    <Text style={styles.yearRangeSummary}>
                      Questions from {yearFrom} to {yearTo}
                    </Text>
                  )}
                </View>
              )}

              {/* ── START BUTTON ── */}
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartQuiz}
              >
                <Text style={styles.startButtonText}>Start Quiz</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default TopicFilterScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  backButton: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 4,
    fontWeight: '600',
  },
  allTopicsButton: {
    backgroundColor: COLORS.primary,
    margin: 16,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allTopicsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allTopicsIcon: { fontSize: 28 },
  allTopicsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  allTopicsSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  arrow: { fontSize: 22, color: COLORS.textLight },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    fontSize: 11,
    color: COLORS.textLight,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: COLORS.textLight, fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  topicCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  topicBullet: { fontSize: 16, marginRight: 12 },
  topicName: { flex: 1, fontSize: 14, color: COLORS.textDark, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  availableRow: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  availableText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    marginTop: 4,
  },
  countGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  choiceButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  choiceButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  choiceButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  choiceButtonTextActive: { color: COLORS.white },
  choiceButtonTextDisabled: { color: COLORS.textLight },
  yearModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  yearModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  yearModeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  yearModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  yearModeTextActive: { color: COLORS.white },
  yearPickerContainer: { marginBottom: 16 },
  yearPickerLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
    marginTop: 8,
  },
  yearScroll: { marginBottom: 8 },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginRight: 8,
  },
  yearChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  yearChipText: { fontSize: 13, color: COLORS.textDark },
  yearChipTextActive: { color: COLORS.white, fontWeight: 'bold' },
  yearRangeSummary: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  startButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelText: { color: COLORS.textLight, fontSize: 14 },
});