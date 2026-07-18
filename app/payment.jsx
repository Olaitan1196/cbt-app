import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import AppTextInput from '../components/AppTextInput';
import { getDeviceId } from "../hooks/useDeviceId";

const PRICE_DISPLAY = "₦100";

const PaymentScreen = ({ route, navigation }) => {
  const { student } = route.params;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handlePay = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Email Required",
        "Please enter your email address to proceed with payment.",
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const deviceId = await getDeviceId();

      const { data, error } = await supabase.functions.invoke(
        "initialize-payment",
        {
          body: { email: email.trim(), deviceId },
        },
      );

      if (error || data?.error) {
        setLoading(false);
        Alert.alert(
          "Error",
          data?.error || "Could not initialize payment. Please try again.",
        );
        return;
      }

      setLoading(false);

      await WebBrowser.openAuthSessionAsync(
        data.authorization_url,
        "passonce://",
      );

      await verifyPayment(data.reference, deviceId);
    } catch (error) {
      setLoading(false);
      Alert.alert(
        "Connection Error",
        "Could not connect to payment server. Please check your internet connection and try again.",
      );
    }
  };

  const verifyPayment = async (reference, deviceId) => {
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-payment",
        {
          body: { reference, deviceId },
        },
      );

      if (error) {
        setVerifying(false);
        Alert.alert(
          "Verification Failed",
          "Could not verify payment. Please check your internet connection.",
          [
            { text: "Cancel" },
            {
              text: "Retry",
              onPress: () => verifyPayment(reference, deviceId),
            },
          ],
        );
        return;
      }

      if (data.success) {
        student.is_paid = 1;
        setVerifying(false);

        Alert.alert(
          "🎉 Payment Successful!",
          "Your device has been permanently unlocked. Thank you for choosing PassOnce CBT!",
          [
            {
              text: "Continue",
              onPress: () => navigation.replace("Dashboard", { student }),
            },
          ],
        );
      } else {
        setVerifying(false);
        Alert.alert(
          "Payment Not Confirmed",
          "We could not confirm your payment yet. If you completed payment please tap Verify below.",
          [
            { text: "Cancel" },
            {
              text: "Verify Payment",
              onPress: () => verifyPayment(reference, deviceId),
            },
          ],
        );
      }
    } catch (error) {
      setVerifying(false);
      Alert.alert(
        "Verification Failed",
        "Could not verify payment. Please check your internet connection.",
        [
          { text: "Cancel" },
          { text: "Retry", onPress: () => verifyPayment(reference, deviceId) },
        ],
      );
    }
  };

  if (verifying) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.verifyingText}>Verifying your payment...</Text>
        <Text style={styles.verifyingSubText}>
          Please wait. Do not close the app.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Unlock Full Access</Text>
          <Text style={styles.headerSubtitle}>
            One time payment — Permanent access
          </Text>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceAmount}>{PRICE_DISPLAY}</Text>
          <Text style={styles.priceLabel}>One Time Payment</Text>
          <Text style={styles.priceNote}>
            Pay once and use forever on this device
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What You Get</Text>

        <View style={styles.featureCard}>
          {[
            {
              icon: "📚",
              text: "Access to all JAMB, WAEC, NECO and NABTEB past questions",
            },
            {
              icon: "🏫",
              text: "Post UTME questions from all major institutions",
            },
            { icon: "🎯", text: "Full JAMB Simulation mode" },
            { icon: "📓", text: "Personal notebook for wrong answers" },
            { icon: "📊", text: "Performance tracking and analytics" },
            { icon: "🏆", text: "Rank system from Poor to Guru" },
            { icon: "📵", text: "Works completely offline after download" },
            { icon: "🔒", text: "Permanent access — no monthly fees ever" },
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Enter Your Email</Text>
        <Text style={styles.emailNote}>
          Your email is needed by Paystack to send your payment receipt. We do
          not store your email permanently.
        </Text>

        <View style={styles.inputContainer}>
          <AppTextInput
            style={styles.emailInput}
            placeholder="Enter your email address"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePay}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payButtonText}>
              Pay {PRICE_DISPLAY} with Paystack
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔐 Payments are processed securely by Paystack. Your card details
            are never stored on this device.
          </Text>
        </View>

        <View style={styles.deviceNote}>
          <Text style={styles.deviceNoteTitle}>📱 About Device Locking</Text>
          <Text style={styles.deviceNoteText}>
            This payment unlocks PassOnce CBT permanently on this specific
            device.
          </Text>
          <Text style={styles.deviceNoteText}>
            If you uninstall and reinstall the app on this same device, your
            access will be automatically restored.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 30,
  },
  verifyingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginTop: 20,
    textAlign: "center",
  },
  verifyingSubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: "center",
  },
  header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 40 },
  backButton: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  priceCard: {
    backgroundColor: COLORS.secondary,
    margin: 16,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
  },
  priceAmount: { fontSize: 52, fontWeight: "bold", color: COLORS.white },
  priceLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    fontWeight: "600",
  },
  priceNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textDark,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  featureCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    elevation: 1,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  featureIcon: { fontSize: 18, width: 24 },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  emailNote: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingHorizontal: 16,
    marginBottom: 10,
    lineHeight: 18,
  },
  inputContainer: { paddingHorizontal: 16, marginBottom: 16 },
  emailInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payButton: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    elevation: 2,
  },
  payButtonText: { color: COLORS.white, fontWeight: "bold", fontSize: 16 },
  securityNote: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#f0fff4",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  securityText: { fontSize: 12, color: COLORS.textDark, lineHeight: 20 },
  deviceNote: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    elevation: 1,
  },
  deviceNoteTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  deviceNoteText: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: 6,
  },
});
