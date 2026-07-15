import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getCurrentProfileWithDeviceCheck } from "../services/authService";
import { COLORS } from "../constants/colors";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Ask Supabase: is anyone logged in right now, and is THIS
        // the authorized device for that account?
        const { profile, kickedOut } = await getCurrentProfileWithDeviceCheck();

        if (kickedOut) {
          // This account was logged in on a different device.
          // This phone has been signed out automatically.
          navigation.replace("Login", { kickedOut: true });
          return;
        }

        if (!profile) {
          // Nobody is logged in. Send them to the Login screen.
          // (Login screen has a link to Register for brand new students.)
          navigation.replace("Login");
          return;
        }

        // Someone is logged in, and this device is authorized.
        // Check if they still have access.
        if (!profile.is_paid) {
          const startDate = new Date(profile.trial_start_date);
          const today = new Date();
          const diffDays = Math.floor(
            (today - startDate) / (1000 * 60 * 60 * 24),
          );

          if (diffDays > 3) {
            navigation.replace("TrialExpired", { profile });
            return;
          }
        }

        // Logged in, authorized device, and either paid or still inside trial window.
        navigation.replace("Dashboard", { profile });
      } catch (error) {
        console.log("Splash session check error:", error);
        // If anything goes wrong checking the session, safest place
        // to send the student is the Login screen.
        navigation.replace("Login");
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PassOnce CBT</Text>
      <ActivityIndicator
        size="large"
        color={COLORS.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  spinner: {
    marginTop: 20,
  },
});