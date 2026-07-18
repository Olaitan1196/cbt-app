// This is the Settings Screen.
// The student can view and edit their profile here.
// They can also see their trial status and payment status.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from "react-native";
import { COLORS } from "../constants/colors";
import { getDb, getCachedSubjects, downloadAndCacheQuestions } from '../database/localCache';
import { updatePassword, logoutStudent } from "../services/authService";
import AppTextInput from "../components/AppTextInput";

const CLASS_LEVELS = ["SSS1", "SSS2", "SSS3", "Graduate"];

const APP_VERSION = "1.0.0";

const SettingsScreen = ({ route, navigation }) => {
  const { student } = route.params;

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(student.name);
  const [editClass, setEditClass] = useState(student.class_level);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleRefreshQuestions = async () => {
    setRefreshing(true);
    setRefreshProgress('Checking what needs updating...');

    try {
      const cachedSubjects = await getCachedSubjects();

      if (cachedSubjects.length === 0) {
        setRefreshing(false);
        Alert.alert('Nothing to Refresh', 'You have not downloaded any subjects yet.');
        return;
      }

      for (let i = 0; i < cachedSubjects.length; i++) {
        const { exam_body, subject } = cachedSubjects[i];
        setRefreshProgress(`Updating ${subject} (${i + 1} of ${cachedSubjects.length})...`);
        await downloadAndCacheQuestions(exam_body, subject, true); // true = force refresh
      }

      setRefreshing(false);
      Alert.alert(
        'Questions Updated',
        `${cachedSubjects.length} subject${cachedSubjects.length !== 1 ? 's have' : ' has'} been refreshed with the latest questions.`
      );
    } catch (error) {
      setRefreshing(false);
      Alert.alert('Update Failed', 'Could not refresh questions. Please check your internet connection and try again.');
    }
  };

  // Check if trial is still active
  const getTrialStatus = () => {
    const startDate = new Date(student.trial_start_date);
    const today = new Date();
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const daysLeft = 3 - diffDays;

    if (student.is_paid) {
      return { label: "Full Access", color: COLORS.success, icon: "✅" };
    }

    if (daysLeft > 0) {
      return {
        label: `Free Trial — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`,
        color: COLORS.warning,
        icon: "⏳",
      };
    }

    return {
      label: "Trial Expired — Please Pay",
      color: COLORS.error,
      icon: "🔒",
    };
  };

  const trialStatus = getTrialStatus();

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (!editClass) {
      Alert.alert("Error", "Please select your class level");
      return;
    }

    try {
      const db = await getDb();
      db.runSync(`UPDATE student SET name = ?, class_level = ? WHERE id = ?`, [
        editName.trim(),
        editClass,
        student.id,
      ]);

      // Update the local student object
      student.name = editName.trim();
      student.class_level = editClass;

      setEditModal(false);
      Alert.alert("Success", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Error", "Could not update profile. Please try again.");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await updatePassword(newPassword);
      setChangingPassword(false);
      setPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert("Success", "Your password has been changed.");
    } catch (error) {
      setChangingPassword(false);
      Alert.alert("Error", error.message || "Could not change password. Please try again.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logoutStudent();
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (error) {
              Alert.alert("Error", "Could not log out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚙️ Settings</Text>
        </View>

        {/* ── PROFILE SECTION ── */}
        <Text style={styles.sectionTitle}>My Profile</Text>

        <View style={styles.profileCard}>
          {/* Avatar circle with first letter of name */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student.name?.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{student.name}</Text>
            <Text style={styles.profileClass}>{student.class_level}</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditModal(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile detail rows */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{student.name}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Class Level</Text>
            <Text style={styles.detailValue}>{student.class_level}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Device ID</Text>
            <Text style={styles.detailValueSmall}>
              {student.device_id?.slice(0, 16)}...
            </Text>
            <View style={styles.detailDivider} />
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setPasswordModal(true)}
          >
            <Text style={styles.detailLabel}>Password</Text>
            <Text style={styles.detailValue}>Change →</Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* ── SUBSCRIPTION SECTION ── */}
        <Text style={styles.sectionTitle}>Subscription</Text>

        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionLeft}>
            <Text style={styles.subscriptionIcon}>{trialStatus.icon}</Text>
            <View>
              <Text style={styles.subscriptionTitle}>Access Status</Text>
              <Text
                style={[
                  styles.subscriptionStatus,
                  { color: trialStatus.color },
                ]}
              >
                {trialStatus.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Show pay button if not paid */}
        {!student.is_paid && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => navigation.navigate("Payment", { student })}
          >
            <Text style={styles.payButtonText}>
              🔓 Unlock Full Access — Pay Once
            </Text>
          </TouchableOpacity>
        )}

        {/* ── DATA MANAGEMENT ── */}
        <Text style={styles.sectionTitle}>Data Management</Text>

        <View style={styles.detailCard}>
          <Text style={styles.refreshNote}>
            Downloaded questions stay on your device permanently once
            saved. If new questions have been added for a subject you
            already downloaded, tap below to get the latest version.
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshQuestions}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? refreshProgress || 'Updating...' : '🔄 Refresh Downloaded Questions'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── APP INFORMATION ── */}
        <Text style={styles.sectionTitle}>App Information</Text>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>App Name</Text>
            <Text style={styles.detailValue}>PassOnce CBT</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Version</Text>
            <Text style={styles.detailValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Database</Text>
            <Text style={styles.detailValue}>Local (On Device)</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Member Since</Text>
            <Text style={styles.detailValue}>
              {student.trial_start_date?.slice(0, 10)}
            </Text>
          </View>
        </View>

        {/* ── ABOUT SECTION ── */}
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            PassOnce CBT is a comprehensive Computer Based Test practice app for
            Nigerian secondary school students preparing for JAMB, WAEC, NECO,
            NABTEB and Post UTME examinations.
          </Text>
          <Text style={styles.aboutText}>
            All questions are stored locally on your device. No internet
            connection is required to take practice tests.
          </Text>
          <Text style={styles.aboutCopyright}>
            © 2026 PassOnce CBT. All rights reserved.
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── EDIT PROFILE MODAL ── */}
      <Modal
        visible={editModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Your Name</Text>
            <AppTextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.inputLabel}>Class Level</Text>
            <View style={styles.classRow}>
              {CLASS_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.classButton,
                    editClass === level && styles.classButtonActive,
                  ]}
                  onPress={() => setEditClass(level)}
                >
                  <Text
                    style={[
                      styles.classButtonText,
                      editClass === level && styles.classButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── CHANGE PASSWORD MODAL ── */}
      <Modal
        visible={passwordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <Text style={styles.inputLabel}>New Password</Text>
            <AppTextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <AppTextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              <Text style={styles.saveButtonText}>
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setPasswordModal(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  backButton: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textLight,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  profileClass: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "bold",
  },
  detailCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: "600",
  },
  detailValueSmall: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: "600",
  },
  refreshNote: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18,
    padding: 14,
    paddingBottom: 0,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    margin: 14,
    marginTop: 12,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  subscriptionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
  },
  subscriptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  subscriptionIcon: { fontSize: 28 },
  subscriptionTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  subscriptionStatus: {
    fontSize: 15,
    fontWeight: "bold",
  },
  payButton: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  payButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 15,
  },
  aboutCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
    gap: 10,
  },
  aboutText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 22,
  },
  aboutCopyright: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 6,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 15,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  classRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
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
    fontWeight: "600",
  },
  classButtonTextActive: { color: COLORS.white },
  saveButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 15,
  },
  cancelButton: { padding: 14, alignItems: "center" },
  cancelText: { color: COLORS.textLight, fontSize: 14 },
});
