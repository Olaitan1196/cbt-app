// This is the Notebook Screen.
// It shows all the questions the student got wrong across all subjects and exams.
// The app saves wrong answers automatically after every quiz.
// The student can read the explanation for each wrong answer here.
// They can also delete an entry from their notebook when they feel
// they have understood it well enough.

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
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/db';

const NotebookScreen = ({ route, navigation }) => {
  const { student } = route.params;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [detailModal, setDetailModal] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('All');
  const [availableSubjects, setAvailableSubjects] = useState([]);

  useEffect(() => {
    loadNotebook();
  }, []);

  const loadNotebook = () => {
    try {
      const db = getDb();

      // Load all notebook entries for this student
      // Join with questions table to get the full question details
      const results = db.getAllSync(
        `SELECT
           notebook.id as notebook_id,
           notebook.date_added,
           questions.id as question_id,
           questions.exam_body,
           questions.year,
           questions.subject,
           questions.topic,
           questions.question_text,
           questions.option_a,
           questions.option_b,
           questions.option_c,
           questions.option_d,
           questions.correct_option,
           questions.explanation
         FROM notebook
         JOIN questions ON notebook.question_id = questions.id
         WHERE notebook.student_id = ?
         ORDER BY notebook.date_added DESC`,
        [student.id]
      );

      setEntries(results);

      // Get unique subjects for the filter tabs
      const subjects = [...new Set(results.map((r) => r.subject))];
      setAvailableSubjects(subjects);

    } catch (error) {
      console.log('Notebook load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete one entry from notebook
  const handleDelete = (notebookId) => {
    Alert.alert(
      'Remove from Notebook',
      'Are you sure you want to remove this question from your notebook? This means you feel you have understood it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            try {
              const db = getDb();
              db.runSync(
                'DELETE FROM notebook WHERE id = ?',
                [notebookId]
              );
              // Refresh the list
              setDetailModal(false);
              loadNotebook();
            } catch (error) {
              console.log('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  // Filter entries by subject
  const filteredEntries =
    activeFilter === 'All'
      ? entries
      : entries.filter((e) => e.subject === activeFilter);

  // Open the detail modal for one entry
  const handleOpenEntry = (entry) => {
    setSelectedEntry(entry);
    setDetailModal(true);
  };

  // Get color for exam body label
  const getExamColor = (examBody) => {
    switch (examBody) {
      case 'JAMB': return '#1a1a2e';
      case 'WAEC': return '#2e7d32';
      case 'NECO': return '#e65100';
      case 'NABTEB': return '#6a1b9a';
      default: return COLORS.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notebook...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📓 My Notebook</Text>
        <Text style={styles.headerSubtitle}>
          {entries.length} wrong answer{entries.length !== 1 ? 's' : ''} saved
        </Text>
      </View>

      {/* ── FILTER TABS ── */}
      {availableSubjects.length > 0 && (
        <View style={styles.filterWrapper}>
          <FlatList
            data={['All', ...availableSubjects]}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  activeFilter === item && styles.filterTabActive,
                ]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[
                  styles.filterTabText,
                  activeFilter === item && styles.filterTabTextActive,
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── EMPTY STATE ── */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'All'
              ? 'Your notebook is empty'
              : `No entries for ${activeFilter}`}
          </Text>
          <Text style={styles.emptySubText}>
            {activeFilter === 'All'
              ? 'Wrong answers from your quizzes will appear here automatically. Keep practising!'
              : 'You have no wrong answers saved for this subject yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.notebook_id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.entryCard}
              onPress={() => handleOpenEntry(item)}
            >
              {/* Top row — exam body, year, subject */}
              <View style={styles.entryHeader}>
                <View style={[
                  styles.examBadge,
                  { backgroundColor: getExamColor(item.exam_body) }
                ]}>
                  <Text style={styles.examBadgeText}>
                    {item.exam_body} {item.year}
                  </Text>
                </View>
                <Text style={styles.entrySubject}>{item.subject}</Text>
              </View>

              {/* Topic if available */}
              {item.topic ? (
                <Text style={styles.entryTopic}>📌 {item.topic}</Text>
              ) : null}

              {/* Question preview — first 100 characters */}
              <Text style={styles.entryQuestion} numberOfLines={2}>
                {item.question_text}
              </Text>

              {/* Correct answer preview */}
              <View style={styles.entryFooter}>
                <Text style={styles.correctAnswerPreview}>
                  ✅ Correct: {item.correct_option} —{' '}
                  {item[`option_${item.correct_option.toLowerCase()}`]}
                </Text>
                <Text style={styles.tapToRead}>Tap to read →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── DETAIL MODAL ── */}
      {/* This pops up when student taps a notebook entry */}
      <Modal
        visible={detailModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setDetailModal(false)}
      >
        {selectedEntry && (
          <SafeAreaView style={styles.modalSafeArea}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Text style={styles.modalClose}>✕ Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(selectedEntry.notebook_id)}
              >
                <Text style={styles.modalDelete}>🗑 Remove</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[selectedEntry]}
              keyExtractor={(item) => item.notebook_id.toString()}
              contentContainerStyle={styles.modalContent}
              renderItem={({ item }) => (
                <View>

                  {/* Exam info */}
                  <View style={styles.modalExamRow}>
                    <View style={[
                      styles.examBadge,
                      { backgroundColor: getExamColor(item.exam_body) }
                    ]}>
                      <Text style={styles.examBadgeText}>
                        {item.exam_body} {item.year}
                      </Text>
                    </View>
                    <Text style={styles.modalSubject}>{item.subject}</Text>
                  </View>

                  {/* Topic */}
                  {item.topic ? (
                    <Text style={styles.modalTopic}>📌 Topic: {item.topic}</Text>
                  ) : null}

                  {/* Question */}
                  <View style={styles.modalQuestionCard}>
                    <Text style={styles.modalQuestionLabel}>Question</Text>
                    <Text style={styles.modalQuestionText}>
                      {item.question_text}
                    </Text>
                  </View>

                  {/* All options */}
                  <Text style={styles.modalSectionLabel}>Options</Text>
                  {[
                    { key: 'A', value: item.option_a },
                    { key: 'B', value: item.option_b },
                    { key: 'C', value: item.option_c },
                    { key: 'D', value: item.option_d },
                  ].map((option) => {
                    const isCorrect = option.key === item.correct_option;
                    return (
                      <View
                        key={option.key}
                        style={[
                          styles.modalOption,
                          isCorrect && styles.modalOptionCorrect,
                        ]}
                      >
                        <View style={[
                          styles.modalOptionBadge,
                          isCorrect && styles.modalOptionBadgeCorrect,
                        ]}>
                          <Text style={[
                            styles.modalOptionBadgeText,
                            isCorrect && styles.modalOptionBadgeTextCorrect,
                          ]}>
                            {option.key}
                          </Text>
                        </View>
                        <Text style={[
                          styles.modalOptionText,
                          isCorrect && styles.modalOptionTextCorrect,
                        ]}>
                          {option.value}
                        </Text>
                        {isCorrect && (
                          <Text style={styles.correctTick}>✓</Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Correct answer highlighted */}
                  <View style={styles.correctAnswerBox}>
                    <Text style={styles.correctAnswerLabel}>
                      ✅ Correct Answer
                    </Text>
                    <Text style={styles.correctAnswerText}>
                      Option {item.correct_option} —{' '}
                      {item[`option_${item.correct_option.toLowerCase()}`]}
                    </Text>
                  </View>

                  {/* Explanation */}
                  {item.explanation ? (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationLabel}>
                        📖 Why This Answer Is Correct
                      </Text>
                      <Text style={styles.explanationText}>
                        {item.explanation}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationLabel}>
                        📖 Explanation
                      </Text>
                      <Text style={styles.explanationText}>
                        No explanation has been added for this question yet.
                      </Text>
                    </View>
                  )}

                  {/* Date saved */}
                  <Text style={styles.dateSaved}>
                    Saved on {item.date_added?.slice(0, 10)}
                  </Text>

                  {/* Remove button at bottom of detail */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleDelete(item.notebook_id)}
                  >
                    <Text style={styles.removeButtonText}>
                      I Understand This — Remove from Notebook
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 40 }} />
                </View>
              )}
            />
          </SafeAreaView>
        )}
      </Modal>

    </SafeAreaView>
  );
};

export default NotebookScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 14,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  backButton: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  filterWrapper: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  filterTabTextActive: { color: COLORS.white },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  examBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  examBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  entrySubject: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  entryTopic: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  entryQuestion: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
    marginBottom: 10,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  correctAnswerPreview: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
    flex: 1,
  },
  tapToRead: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },

  // Detail Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalClose: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalDelete: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  modalExamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalSubject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  modalTopic: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  modalQuestionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  modalQuestionLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalQuestionText: {
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 26,
    fontWeight: '500',
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalOption: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  modalOptionCorrect: {
    borderColor: COLORS.success,
    backgroundColor: '#f0fff4',
  },
  modalOptionBadge: {
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
  modalOptionBadgeCorrect: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  modalOptionBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: COLORS.textDark,
  },
  modalOptionBadgeTextCorrect: { color: COLORS.white },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  modalOptionTextCorrect: {
    color: COLORS.success,
    fontWeight: '600',
  },
  correctTick: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: 'bold',
  },
  correctAnswerBox: {
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  correctAnswerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 4,
  },
  correctAnswerText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  explanationBox: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  explanationLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 22,
  },
  dateSaved: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  removeButton: {
    borderWidth: 2,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  removeButtonText: {
    color: COLORS.error,
    fontWeight: 'bold',
    fontSize: 13,
  },
});