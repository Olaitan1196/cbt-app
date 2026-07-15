import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { loginStudent } from '../services/authService';
import { COLORS } from '../constants/colors';

export default function LoginScreen({ navigation, route }) {
  const [identifier, setIdentifier] = useState(''); // username OR email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route.params?.kickedOut) {
      Alert.alert(
        'Logged Out',
        'This account was used to log in on another device, so you have been signed out here. Log in again to continue on this device.'
      );
    }
  }, [route.params?.kickedOut]);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Missing Info', 'Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginStudent(identifier.trim(), password);
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to continue your preparation</Text>

      <Text style={styles.label}>Username or Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter username or email"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotLink}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}></TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>Don't have an account? Create one</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    textAlign: 'center',
    color: COLORS.primary,
    marginTop: 16,
    fontSize: 14,
  },
  forgotLink: {
    textAlign: 'right',
    color: COLORS.primary,
    marginTop: 10,
    fontSize: 13,
  },
});