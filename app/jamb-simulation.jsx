// This is the JAMB Simulation Screen.
// It simulates the real JAMB exam experience.
// English Language is automatically included and cannot be removed.
// The student must select exactly 3 more subjects to make 4 total.
// Time is fixed at 90 minutes. No topic filter. No year range. No question count choice.
// English gets 60 questions. Other 3 subjects get 40 questions each.
// Total = 180 questions. Score is out of 400.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { SUBJECTS } from '../constants/subjects';
import { getDb } from '../database/db';

// English is always included. Student picks from the rest.
const ENGLISH = 'English Language';
const JAMB_SUBJECTS_WITHOUT_ENGLISH = SUBJECTS.JAMB.filter(
  (s) => s !== ENGLISH
);

const JambSimulationScreen = ({ route, navigation }) => {
  const { student } = route.params;

  // The 3 subjects the student will pick
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      // Remove it if already selected
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
    } else {
      if (selectedSubjects.length >= 3) {
        Alert.alert(
          'Maximum Reached',
          'You can only select 3 more subjects. English Language is already included.'
        );
        return;
      }
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleProceed = () => {
    if (selectedSubjects.length < 3) {
      Alert.alert(
        'Select 3 More Subjects',
        `You have selected ${selectedSubjects.length} subject(s). You need exactly 3 more subjects in addition to English Language.`
      );
      return;
    }
    // Show confirmation modal
    setConfirmModal(true);
  };

  const handleStartSimulation = () => {
    setConfirmModal(false);

    // All four subjects in order — English first
    const allFourSubjects = [ENGLISH, ...selectedSubjects];

    // Load questions for all subjects and combine them
    loadSimulationQuestions(allFourSubjects);
  };

  const loadSimulationQuestions = (subjects) => {
    try {
      const db = getDb();
      let allQuestions = [];

      for (const subject of subjects) {
        // English gets 60 questions, others get 40
        const limit = subject === ENGLISH ? 60 : 40;

        const questions = db.getAllSync(
          `SELECT * FROM questions
           WHERE exam_body = 'JAMB' AND subject = ?
           ORDER BY RANDOM() LIMIT ?`,
          [subject, limit]
        );

        // Tag each question with its subject for display in quiz
        const tagged = questions.map((q) => ({
          ...q,
          simulation_subject: subject,
        }));

        allQuestions = [...allQuestions, ...tagged];
      }

      if (allQuestions.length === 0) {
        Alert.alert(
          'No Questions Found',
          'There are no JAMB questions in the database yet for the selected subjects. Please load questions first.'
        );
        return;
      }

      // Go to simulation quiz screen
      navigation.navigate('SimulationQuiz', {
        student,
        questions: allQuestions,
        subjects: subjects,
        timerMinutes: 90,
      });

    } catch (error) {
      console.log('Simulation load error:', error);
      Alert.alert('Error', 'Could not load questions. Please try again.');
    }
  };

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
          <Text style={styles.headerTitle}>JAMB Simulation</Text>
          <Text style={styles.headerSubtitle}>
            Full exam experience — 180 questions — 90 minutes
          </Text>
        </View>

        {/* ── RULES CARD ── */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>📋 Exam Rules</Text>
          <Text style={styles.ruleItem}>⏱ Time: 90 minutes (fixed)</Text>
          <Text style={styles.ruleItem}>📚 Subjects: 4 (English + 3 of your choice)</Text>
          <Text style={styles.ruleItem}>❓ English Language: 60 questions</Text>
          <Text style={styles.ruleItem}>❓ Other subjects: 40 questions each</Text>
          <Text style={styles.ruleItem}>🎯 Total: 180 questions</Text>
          <Text style={styles.ruleItem}>💯 Score: Out of 400</Text>
          <Text style={styles.ruleItem}>🚫 No topic filter or year range</Text>
        </View>

        {/* ── ENGLISH — LOCKED IN ── */}
        <Text style={styles.sectionTitle}>Your Subjects</Text>

        <View style={styles.lockedSubject}>
          <View style={styles.lockedLeft}>
            <Text style={styles.lockedIcon}>🔒</Text>
            <View>
              <Text style={styles.lockedName}>English Language</Text>
              <Text style={styles.lockedNote}>
                Automatically included — 60 questions
              </Text>
            </View>
          </View>
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedBadgeText}>Fixed</Text>
          </View>
        </View>

        {/* Selected subjects preview */}
        {selectedSubjects.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={styles.selectedSubjectRow}
            onPress={() => toggleSubject(subject)}
          >
            <View style={styles.lockedLeft}>
              <Text style={styles.lockedIcon}>✅</Text>
              <View>
                <Text style={styles.lockedName}>{subject}</Text>
                <Text style={styles.lockedNote}>40 questions — tap to remove</Text>
              </View>
            </View>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        ))}

        {/* Slots remaining */}
        {selectedSubjects.length < 3 && (
          <View style={styles.slotsRemaining}>
            <Text style={styles.slotsText}>
              Select {3 - selectedSubjects.length} more subject
              {3 - selectedSubjects.length !== 1 ? 's' : ''} below
            </Text>
          </View>
        )}

        {/* ── SUBJECT PICKER ── */}
        <Text style={styles.sectionTitle}>Choose 3 More Subjects</Text>

        {JAMB_SUBJECTS_WITHOUT_ENGLISH.map((subject) => {
          const isSelected = selectedSubjects.includes(subject);
          return (
            <TouchableOpacity
              key={subject}
              style={[
                styles.subjectOption,
                isSelected && styles.subjectOptionSelected,
              ]}
              onPress={() => toggleSubject(subject)}
            >
              <Text style={[
                styles.subjectOptionText,
                isSelected && styles.subjectOptionTextSelected,
              ]}>
                {subject}
              </Text>
              {isSelected && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── PROCEED BUTTON ── */}
        <View style={styles.proceedContainer}>
          <TouchableOpacity
            style={[
              styles.proceedButton,
              selectedSubjects.length < 3 && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceed}
          >
            <Text style={styles.proceedButtonText}>
              {selectedSubjects.length < 3
                ? `Select ${3 - selectedSubjects.length} More Subject${3 - selectedSubjects.length !== 1 ? 's' : ''}`
                : 'Proceed to Exam →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── CONFIRMATION MODAL ── */}
      <Modal
        visible={confirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ready to Start?</Text>
            <Text style={styles.modalSubtitle}>
              Your 4 subjects for this simulation:
            </Text>

            {/* Subject list in modal */}
            <View style={styles.modalSubjectList}>
              {[ENGLISH, ...selectedSubjects].map((subject, index) => (
                <View key={subject} style={styles.modalSubjectRow}>
                  <Text style={styles.modalSubjectNumber}>{index + 1}</Text>
                  <Text style={styles.modalSubjectName}>{subject}</Text>
                  <Text style={styles.modalSubjectQuestions}>
                    {subject === ENGLISH ? '60 Qs' : '40 Qs'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalSummaryRow}>
              <Text style={styles.modalSummaryLabel}>Total Questions</Text>
              <Text style={styles.modalSummaryValue}>180</Text>
            </View>
            <View style={styles.modalSummaryRow}>
              <Text style={styles.modalSummaryLabel}>Time Allowed</Text>
              <Text style={styles.modalSummaryValue}>90 minutes</Text>
            </View>
            <View style={styles.modalSummaryRow}>
              <Text style={styles.modalSummaryLabel}>Total Score</Text>
              <Text style={styles.modalSummaryValue}>400 marks</Text>
            </View>

            <Text style={styles.modalWarning}>
              ⚠️ Once you start, the timer begins immediately and cannot be paused.
            </Text>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartSimulation}
            >
              <Text style={styles.startButtonText}>Start Simulation Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setConfirmModal(false)}
            >
              <Text style={styles.cancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default JambSimulationScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
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
  rulesCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  ruleItem: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  lockedSubject: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  lockedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  lockedIcon: { fontSize: 20 },
  lockedName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  lockedNote: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  lockedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockedBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectedSubjectRow: {
    backgroundColor: '#e3f2fd',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  removeText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  slotsRemaining: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  slotsText: {
    color: COLORS.warning,
    fontWeight: '600',
    fontSize: 13,
  },
  subjectOption: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  subjectOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#eef0ff',
  },
  subjectOptionText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  subjectOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedContainer: {
    padding: 16,
    marginTop: 8,
  },
  proceedButton: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  proceedButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSubjectList: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  modalSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalSubjectNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  modalSubjectName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  modalSubjectQuestions: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalSummaryLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  modalSummaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  modalWarning: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 18,
  },
  startButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  startButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
});