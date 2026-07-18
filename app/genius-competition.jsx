import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { SUBJECTS } from '../constants/subjects';
import AppTextInput from '../components/AppTextInput';
import {
  getActiveSeason,
  getEntryTier,
  getParticipant,
  registerParticipant,
} from '../services/competitionService';

// English is compulsory and fixed — students pick 3 more from this list.
const OPTIONAL_SUBJECTS = SUBJECTS.JAMB.filter((s) => s !== 'English Language');

// A real JAMB reg number looks like: [4-digit year][8 digits][2 letters]
// e.g. 202612345678AB — the year must match the season this competition is for.
const validateJambRegNumber = (regNumber, seasonYear) => {
  const cleaned = regNumber.trim().toUpperCase();
  const pattern = new RegExp(`^${seasonYear}\\d{8}[A-Z]{2}$`);

  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      message: `Please enter the JAMB registration number you used to register for the ${seasonYear} JAMB examination.`,
    };
  }

  return { valid: true, cleaned };
};

export default function GeniusCompetitionScreen({ route, navigation }) {
  const { student } = route.params;

  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(null);
  const [participant, setParticipant] = useState(null);

  const [jambRegNumber, setJambRegNumber] = useState('');
  const [courseOfStudy, setCourseOfStudy] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCompetitionState();
  }, []);

  const loadCompetitionState = async () => {
    try {
      const activeSeason = await getActiveSeason();
      setSeason(activeSeason);

      if (activeSeason) {
        const existingParticipant = await getParticipant(activeSeason.id, student.id);
        setParticipant(existingParticipant);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load competition information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
    } else {
      if (selectedSubjects.length >= 3) {
        Alert.alert('Limit Reached', 'You can only select 3 subjects besides English Language.');
        return;
      }
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

const handleRegister = async () => {
    if (!jambRegNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your JAMB registration number.');
      return;
    }

    const regCheck = validateJambRegNumber(jambRegNumber, season.jamb_year);
    if (!regCheck.valid) {
      Alert.alert('Invalid Registration Number', regCheck.message);
      return;
    }

    if (!courseOfStudy.trim()) {
      Alert.alert('Missing Information', 'Please enter your course of study.');
      return;
    }
    if (selectedSubjects.length !== 3) {
      Alert.alert('Missing Information', 'Please select exactly 3 subjects besides English Language.');
      return;
    }

    setSubmitting(true);

    try {
      const entryTier = await getEntryTier(season.id);

      if (!entryTier) {
        setSubmitting(false);
        Alert.alert('Not Ready', 'The competition has not been fully set up yet. Please check back later.');
        return;
      }

      const newParticipant = await registerParticipant({
        seasonId: season.id,
        userId: student.id,
        jambRegNumber: regCheck.cleaned,
        courseOfStudy: courseOfStudy.trim(),
        subject2: selectedSubjects[0],
        subject3: selectedSubjects[1],
        subject4: selectedSubjects[2],
        entryTierNumber: entryTier.tier_number,
      });

      setParticipant(newParticipant);
      setSubmitting(false);
    } catch (error) {
      setSubmitting(false);

      // Postgres error code 23505 = "unique constraint violated"
      if (error.code === '23505') {
        Alert.alert(
          'Registration Number Already Used',
          'This JAMB registration number is already registered on another account. If this is your number and you believe this is a mistake, please contact support.'
        );
      } else {
        Alert.alert('Registration Failed', 'Something went wrong. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // No competition currently running
  if (!season) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerScreen}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No Competition Right Now</Text>
          <Text style={styles.emptyText}>
            There is no active Genius Competition at the moment. Please check back later.
          </Text>
          <TouchableOpacity style={styles.backButtonFull} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonFullText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Already registered
  if (participant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerScreen}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>You're Registered!</Text>
          <Text style={styles.emptyText}>
            JAMB Reg Number: {participant.jamb_reg_number}{'\n'}
            Current Tier: {participant.current_tier}
          </Text>
          <TouchableOpacity
            style={styles.backButtonFull}
            onPress={() => navigation.navigate('CompetitionAttempt', { student })}
          >
            <Text style={styles.backButtonFullText}>Start Competition Attempt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backButtonFull, { backgroundColor: COLORS.secondary, marginTop: 10 }]}
            onPress={() => navigation.navigate('GeniusTable', { student })}
          >
            <Text style={styles.backButtonFullText}>View Genius Table</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonFull} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonFullText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Registration form
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Genius Competition</Text>
          <Text style={styles.headerSubtitle}>Register to join this season</Text>
        </View>

        <Text style={styles.sectionTitle}>JAMB Registration Number</Text>
        <View style={styles.inputContainer}>
          <AppTextInput
            style={styles.input}
            placeholder="Enter your JAMB reg number"
            placeholderTextColor={COLORS.textLight}
            value={jambRegNumber}
            onChangeText={setJambRegNumber}
            autoCapitalize="characters"
          />
        </View>

        <Text style={styles.sectionTitle}>Course of Study</Text>
        <View style={styles.inputContainer}>
          <AppTextInput
            style={styles.input}
            placeholder="e.g. Medicine and Surgery"
            placeholderTextColor={COLORS.textLight}
            value={courseOfStudy}
            onChangeText={setCourseOfStudy}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Select 3 Subjects ({selectedSubjects.length}/3)
        </Text>
        <Text style={styles.subjectNote}>
          English Language is compulsory and already included.
        </Text>

        <View style={styles.subjectGrid}>
          {OPTIONAL_SUBJECTS.map((subject) => {
            const isSelected = selectedSubjects.includes(subject);
            return (
              <TouchableOpacity
                key={subject}
                style={[styles.subjectChip, isSelected && styles.subjectChipSelected]}
                onPress={() => toggleSubject(subject)}
              >
                <Text
                  style={[styles.subjectChipText, isSelected && styles.subjectChipTextSelected]}
                >
                  {subject}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.registerButtonText}>Register for Competition</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonText: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  backButtonFull: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  backButtonFullText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  subjectNote: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  inputContainer: { paddingHorizontal: 16 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  subjectChip: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjectChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subjectChipText: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  subjectChipTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    elevation: 2,
  },
  registerButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});