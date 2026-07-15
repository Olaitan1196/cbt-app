// This screen appears when the student's 3 day free trial has expired.
// It blocks all access to the app until payment is made.
// Push notifications are disabled during Expo Go testing.
// They will be re-enabled in the final production build.

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { COLORS } from "../constants/colors";

const TrialExpiredScreen = ({ route, navigation }) => {
  const { student } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── TOP ICON ── */}
        <View style={styles.iconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* ── MAIN MESSAGE ── */}
        <Text style={styles.title}>Your Free Trial Has Ended</Text>
        <Text style={styles.subtitle}>
          Hello {student.name}, your 3 day free trial of PassOnce CBT has
          expired. To continue practising and preparing for your exams, you need
          to unlock full access.
        </Text>

        {/* ── WHAT THEY ARE MISSING ── */}
        <View style={styles.missingCard}>
          <Text style={styles.missingTitle}>
            You are currently locked out of:
          </Text>
          {[
            "📘 JAMB past questions from all years",
            "📗 WAEC past questions from all years",
            "📙 NECO past questions from all years",
            "📕 NABTEB past questions from all years",
            "🏫 Post UTME from all major institutions",
            "🎯 JAMB Simulation mode",
            "📓 Your notebook of wrong answers",
            "📊 Your performance tracker",
          ].map((item, index) => (
            <Text key={index} style={styles.missingItem}>
              {item}
            </Text>
          ))}
        </View>

        {/* ── WHY PAY ── */}
        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>Why You Should Pay Now</Text>
          <Text style={styles.reasonText}>
            ✅ One time payment — pay once, use forever
          </Text>
          <Text style={styles.reasonText}>
            ✅ Works on this device even after reinstall
          </Text>
          <Text style={styles.reasonText}>
            ✅ Thousands of real past questions available
          </Text>
          <Text style={styles.reasonText}>
            ✅ No monthly subscription or hidden charges
          </Text>
          <Text style={styles.reasonText}>
            ✅ Your scores and notebook are already saved
          </Text>
        </View>

        {/* ── HOW PAYMENT WORKS ── */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>📋 How Payment Works</Text>
          <Text style={styles.howStep}>
            1. Tap the button below to go to the payment page
          </Text>
          <Text style={styles.howStep}>
            2. Enter your email address on the payment page
          </Text>
          <Text style={styles.howStep}>
            3. Pay securely using your card, bank transfer or USSD
          </Text>
          <Text style={styles.howStep}>
            4. Your device is permanently unlocked immediately
          </Text>
          <Text style={styles.howStep}>
            5. Even if you reinstall the app, your access remains
          </Text>
        </View>

        {/* ── PAY BUTTON ── */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => navigation.navigate("Payment", { student })}
        >
          <Text style={styles.payButtonText}>🔓 Unlock Full Access Now</Text>
        </TouchableOpacity>

        {/* ── ALREADY PAID ── */}
        <TouchableOpacity
          style={styles.alreadyPaidButton}
          onPress={() => navigation.replace("Splash")}
        >
          <Text style={styles.alreadyPaidText}>
            I already paid — Check my access
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default TrialExpiredScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  lockIcon: { fontSize: 48 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  missingCard: {
    backgroundColor: "#fff5f5",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    marginBottom: 16,
    gap: 8,
  },
  missingTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.error,
    marginBottom: 8,
  },
  missingItem: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 22,
  },
  reasonCard: {
    backgroundColor: "#f0fff4",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    marginBottom: 16,
    gap: 8,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 22,
  },
  howCard: {
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginBottom: 24,
    gap: 8,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  howStep: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 22,
  },
  payButton: {
    backgroundColor: COLORS.secondary,
    width: "100%",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
  },
  payButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  alreadyPaidButton: {
    padding: 14,
    alignItems: "center",
  },
  alreadyPaidText: {
    color: COLORS.textLight,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
