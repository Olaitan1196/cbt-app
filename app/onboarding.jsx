// This is the Onboarding Screen.
// It only appears the very first time a student opens the app.
// The student enters their name and class level here.
// After submitting, their profile is saved and they go to the Dashboard.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/db';
import { getDeviceId } from '../hooks/useDeviceId';

// These are the class levels a student can select
const CLASS_LEVELS = ['SS1', 'SS2', 'SS3', 'Graduate'];

export default function OnboardingScreen({ navigation }) {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const handleGetStarted = async () => {
    // Make sure student has entered their name
    if (!name.trim()) {
      Alert.alert('Please enter your name');
      return;
    }

    // Make sure student has selected a class level
    if (!selectedClass) {
      Alert.alert('Please select your class level');
      return;
    }

    try {
      const deviceId = await getDeviceId();
      const db = getDb();
      const today = new Date().toISOString();

      // Save the student profile into the database
      await db.runAsync(
        `INSERT INTO student (name, class_level, device_id, trial_start_date, is_paid)
         VALUES (?, ?, ?, ?, 0)`,
        [name.trim(), selectedClass, deviceId, today]
      );

      // Get the student we just saved so we can pass it to Dashboard
      const student = await db.getFirstAsync(
        'SELECT * FROM student WHERE device_id = ?',
        [deviceId]
      );

      // Go to Dashboard and carry the student info along
      navigation.replace('Dashboard', { student });

    } catch (error) {
      Alert.alert('Something went wrong', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Welcome Text */}
      <Text style={styles.title}>Welcome to EduPass CBT</Text>
      <Text style={styles.subtitle}>
        Let us set up your profile. This only takes a few seconds.
      </Text>

      {/* Name Input */}
      <Text style={styles.label}>What is your name?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        placeholderTextColor={COLORS.textLight}
        value={name}
        onChangeText={setName}
      />

      {/* Class Level Selection */}
      <Text style={styles.label}>What is your class level?</Text>
      <View style={styles.classRow}>
        {CLASS_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.classButton,
              selectedClass === level && styles.classButtonActive,
            ]}
            onPress={() => setSelectedClass(level)}
          >
            <Text
              style={[
                styles.classButtonText,
                selectedClass === level && styles.classButtonTextActive,
              ]}
            >
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  classRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 40,
  },
  classButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  classButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  classButtonText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  classButtonTextActive: {
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});