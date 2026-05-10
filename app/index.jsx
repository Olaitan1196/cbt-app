// This is the Splash Screen.
// It is the first thing a student sees when they open the app.
// It shows the app logo and name for 3 seconds,
// then automatically moves to the Onboarding screen
// if the student is new, or Dashboard if they have used the app before.

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getDb } from '../database/db';
import { getDeviceId } from '../hooks/useDeviceId';

export default function SplashScreen({ navigation }) {

  useEffect(() => {
    // Wait 2 seconds to show the splash, then decide where to go
    const timer = setTimeout(() => {
      checkIfStudentExists();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkIfStudentExists = async () => {
    try {
      const deviceId = await getDeviceId();
      const db = getDb();

      // Check if this device already has a student profile
      const student = await db.getFirstAsync(
        'SELECT * FROM student WHERE device_id = ?',
        [deviceId]
      );

      if (student) {
        // Student has used this app before — go straight to Dashboard
        navigation.replace('Dashboard', { student });
      } else {
        // First time opening the app — go to Onboarding
        navigation.replace('Onboarding');
      }
    } catch (error) {
      console.log('Splash error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* App Logo Area */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>📚</Text>
      </View>

      {/* App Name */}
      <Text style={styles.appName}>EduPass CBT</Text>
      <Text style={styles.tagline}>Your Exam. Your Future. Your Preparation.</Text>

      {/* Loading dots at the bottom */}
      <Text style={styles.loading}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.secondary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loading: {
    position: 'absolute',
    bottom: 40,
    color: COLORS.textLight,
    fontSize: 13,
  },
});