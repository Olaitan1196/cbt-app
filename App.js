import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { initDatabase, seedSampleQuestions } from './database/db';
import SplashScreen from './app/index';
import OnboardingScreen from './app/onboarding';
import DashboardScreen from './app/dashboard';
import InstitutionSelectScreen from './app/institution-select';
import SubjectSelectScreen from './app/subject-select';
import TopicFilterScreen from './app/topic-filter';
import QuizScreen from './app/quiz';
import ResultsScreen from './app/results';
import JambSimulationScreen from './app/jamb-simulation';
import SimulationQuizScreen from './app/simulation-quiz';
import SimulationResultsScreen from './app/simulation-results';

const Stack = createStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

useEffect(() => {
    initDatabase()
      .then(() => seedSampleQuestions())
      .then(() => setDbReady(true))
      .catch((error) => setDbError(error.message));
  }, []);

  if (!dbReady && !dbError) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (dbError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Database Error: {dbError}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="InstitutionSelect" component={InstitutionSelectScreen} />
        <Stack.Screen name="SubjectSelect" component={SubjectSelectScreen} />
        <Stack.Screen name="TopicFilter" component={TopicFilterScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="JambSimulation" component={JambSimulationScreen} />
        <Stack.Screen name="SimulationQuiz" component={SimulationQuizScreen} />
        <Stack.Screen name="SimulationResults" component={SimulationResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    padding: 20,
    textAlign: 'center',
  },
});