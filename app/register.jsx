import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppTextInput from "../components/AppTextInput";
import { Picker } from "@react-native-picker/picker";
import { STATES, getLGAsForState } from "../constants/nigeriaStatesLGA";
import { registerStudent } from "../services/authService";
import { COLORS } from "../constants/colors";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [classLevel, setClassLevel] = useState("SS3");
  const [state, setState] = useState(STATES[0]);
  const [lga, setLga] = useState(getLGAsForState(STATES[0])[0]);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  // When the student changes the State dropdown, the LGA list
  // must refresh to match that state, and the LGA dropdown
  // resets to the first option in the new list.
  const handleStateChange = (newState) => {
    setState(newState);
    const newLgaList = getLGAsForState(newState);
    setLga(newLgaList[0]);
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Info", "Please enter your full name.");
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert(
        "Invalid Username",
        "Username must be at least 3 characters.",
      );
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Your passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerStudent({
        email: email.trim().toLowerCase(),
        password,
        username: username.trim(),
        fullName: fullName.trim(),
        state,
        lga,
        classLevel,
        referralCode: referralCode.trim(),
      });

      Alert.alert(
        "Account Created",
        "Welcome to PassOnce CBT! Your 3-day free trial has started.",
        [{ text: "Continue", onPress: () => navigation.replace("Dashboard") }],
      );
    } catch (error) {
      Alert.alert(
        "Registration Failed",
        error.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      <Text style={styles.subtitle}>
        Join thousands of students preparing smarter
      </Text>

      <Text style={styles.label}>Full Name</Text>
      <AppTextInput
        style={styles.input}
        placeholder="e.g. Olaitan Adewale"
        placeholderTextColor={COLORS.textLight}
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Username</Text>
      <AppTextInput
        style={styles.input}
        placeholder="Choose a unique username"
        placeholderTextColor={COLORS.textLight}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Email Address</Text>
      <AppTextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor={COLORS.textLight}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordRow}>
        <AppTextInput
          style={styles.passwordInput}
          placeholder="At least 6 characters"
          placeholderTextColor={COLORS.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.passwordRow}>
        <AppTextInput
          style={styles.passwordInput}
          placeholder="Re-type your password"
          placeholderTextColor={COLORS.textLight}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Class Level</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={classLevel}
          onValueChange={setClassLevel}
          style={styles.picker}
          dropdownIconColor={COLORS.textDark}
        >
          <Picker.Item label="SSS1" value="SSS1" color={COLORS.textDark} />
          <Picker.Item label="SSS2" value="SSS2" color={COLORS.textDark} />
          <Picker.Item label="SSS3" value="SSS3" color={COLORS.textDark} />
          <Picker.Item label="Graduate" value="Graduate" color={COLORS.textDark} />
        </Picker>
      </View>

      <Text style={styles.label}>State</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={state}
          onValueChange={handleStateChange}
          style={styles.picker}
          dropdownIconColor={COLORS.textDark}
        >
          {STATES.map((s) => (
            <Picker.Item key={s} label={s} value={s} color={COLORS.textDark} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Local Government Area</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={lga}
          onValueChange={setLga}
          style={styles.picker}
          dropdownIconColor={COLORS.textDark}
        >
          {getLGAsForState(state).map((l) => (
            <Picker.Item key={l} label={l} value={l} color={COLORS.textDark} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Referral Code (optional)</Text>
      <AppTextInput
        style={styles.input}
        placeholder="Have a code from a friend? Enter it here"
        placeholderTextColor={COLORS.textLight}
        value={referralCode}
        onChangeText={(text) => setReferralCode(text.toUpperCase())}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.loginLink}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: COLORS.textDark,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: COLORS.textDark,
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  picker: {
    color: COLORS.textDark,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    textAlign: "center",
    color: COLORS.primary,
    marginTop: 16,
    fontSize: 14,
  },
});