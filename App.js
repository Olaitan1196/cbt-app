import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { initDatabase } from './database/localCache';
import SplashScreen from './app/index';
import LoginScreen from './app/login';
import RegisterScreen from './app/register';
import DashboardScreen from './app/dashboard';
import InstitutionSelectScreen from './app/institution-select';
import SubjectSelectScreen from './app/subject-select';
import TopicFilterScreen from './app/topic-filter';
import QuizScreen from './app/quiz';
import ResultsScreen from './app/results';
import JambSimulationScreen from './app/jamb-simulation';
import SimulationLobbyScreen from './app/simulation-lobby';
import SimulationQuizScreen from './app/simulation-quiz';
import SimulationResultsScreen from './app/simulation-results';
import NotebookScreen from './app/notebook';
import PerformanceScreen from './app/performance';
import SettingsScreen from './app/settings';
import PaymentScreen from './app/payment';
import TrialExpiredScreen from './app/trial-expired';
import GeniusCompetitionScreen from './app/genius-competition';
import CompetitionAttemptScreen from './app/competition-attempt';
import CompetitionQuizScreen from './app/competition-quiz';
import CompetitionAttemptResultsScreen from './app/competition-attempt-results';
import GeniusTableScreen from './app/genius-table';
import ForgotPasswordScreen from './app/forgot-password';
import ResetPasswordScreen from './app/reset-password';
const Stack = createStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((error) => setDbError(error.message));
  }, []);

  if (!dbReady && !dbError) {
    return (
      <GestureHandlerRootView style={styles.flexOne}>
        <View style={styles.center}>
          <Text style={styles.text}>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (dbError) {
    return (
      <GestureHandlerRootView style={styles.flexOne}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Database Error: {dbError}</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="InstitutionSelect" component={InstitutionSelectScreen} />
        <Stack.Screen name="SubjectSelect" component={SubjectSelectScreen} />
        <Stack.Screen name="TopicFilter" component={TopicFilterScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="JambSimulation" component={JambSimulationScreen} />
        <Stack.Screen name="SimulationLobby" component={SimulationLobbyScreen} />
        <Stack.Screen name="SimulationQuiz" component={SimulationQuizScreen} />
        <Stack.Screen name="SimulationResults" component={SimulationResultsScreen} />
        <Stack.Screen name="Notebook" component={NotebookScreen} />
        <Stack.Screen name="Performance" component={PerformanceScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="TrialExpired" component={TrialExpiredScreen} />
        <Stack.Screen name="GeniusCompetition" component={GeniusCompetitionScreen} />
        <Stack.Screen name="CompetitionAttempt" component={CompetitionAttemptScreen} />
        <Stack.Screen name="CompetitionQuiz" component={CompetitionQuizScreen} />
        <Stack.Screen name="CompetitionAttemptResults" component={CompetitionAttemptResultsScreen} />
        <Stack.Screen name="GeniusTable" component={GeniusTableScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
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
  flexOne: {
    flex: 1,
  },
});